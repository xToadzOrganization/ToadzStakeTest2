// ==================== STATE ====================
let provider = null;
let signer = null;
let userAddress = null;
let isConnected = false;
let currentTab = 'collections';
let userNfts = {};
let stakedNfts = {};
let collectionMetadata = {}; // Cache for JSON metadata
let currentCollectionView = null;

// ==================== INIT ====================
document.addEventListener('DOMContentLoaded', init);

async function init() {
    setupEventListeners();
    await loadCollectionMetadata();
    await loadCollections();
    
    // Handle URL hash routing
    handleHashRoute();
    window.addEventListener('hashchange', handleHashRoute);
    
    // Check if already connected
    if (window.ethereum && window.ethereum.selectedAddress) {
        await connectWallet();
    }
}

function handleHashRoute() {
    const hash = window.location.hash.slice(1); // Remove #
    const validTabs = ['collections', 'my-nfts', 'staking', 'lp', 'governance'];
    if (hash && validTabs.includes(hash)) {
        switchTab(hash, false); // false = don't update hash again
    }
}

// ==================== LOAD METADATA ====================
async function loadCollectionMetadata() {
    for (const col of COLLECTIONS) {
        if (col.jsonFile) {
            try {
                const response = await fetch(col.jsonFile);
                if (response.ok) {
                    let data = await response.json();
                    
                    // Convert array format to object format if needed
                    if (Array.isArray(data)) {
                        const obj = {};
                        for (const item of data) {
                            obj[item.id] = item;
                        }
                        data = obj;
                    }
                    
                    collectionMetadata[col.address] = data;
                }
            } catch (err) {
                console.log(`Could not load metadata for ${col.name}:`, err.message);
            }
        }
    }
}

// ==================== EVENT LISTENERS ====================
function setupEventListeners() {
    // Connect button
    document.getElementById('connectBtn').addEventListener('click', connectWallet);
    
    // Tab navigation
    document.querySelectorAll('.nav-btn, .mobile-nav-btn').forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });
    
    // Modal close
    document.getElementById('modalClose').addEventListener('click', closeModal);
    document.getElementById('nftModal').addEventListener('click', (e) => {
        if (e.target.id === 'nftModal') closeModal();
    });
    
    // Filter buttons
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            filterCollections(btn.dataset.filter);
        });
    });
    
    // Sort dropdown
    document.getElementById('sortCollections').addEventListener('change', (e) => {
        sortCollections(e.target.value);
    });
    
    // Staking actions
    document.getElementById('stakeAllBtn')?.addEventListener('click', stakeAllNfts);
    document.getElementById('unstakeAllBtn')?.addEventListener('click', unstakeAllNfts);
    document.getElementById('claimStakeRewardsBtn')?.addEventListener('click', claimStakingRewards);
}

// ==================== WALLET ====================
async function connectWallet() {
    if (!window.ethereum) {
        showToast('Please install MetaMask', 'error');
        return;
    }
    
    try {
        const btn = document.getElementById('connectBtn');
        btn.textContent = 'Connecting...';
        
        // Request accounts
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        userAddress = accounts[0];
        
        // Check network
        const chainId = await window.ethereum.request({ method: 'eth_chainId' });
        if (parseInt(chainId, 16) !== SONGBIRD_CHAIN_ID) {
            await switchToSongbird();
        }
        
        // Setup provider
        provider = new ethers.providers.Web3Provider(window.ethereum);
        signer = provider.getSigner();
        isConnected = true;
        
        // Update UI
        btn.textContent = formatAddress(userAddress);
        btn.classList.add('connected');
        
        // Load user data
        await Promise.all([
            loadBalances(),
            loadUserNfts(),
            loadStakedNfts(),
            loadLpPosition()
        ]);
        
        // Listen for account changes
        window.ethereum.on('accountsChanged', handleAccountChange);
        window.ethereum.on('chainChanged', () => window.location.reload());
        
        showToast('Wallet connected');
        
    } catch (err) {
        console.error('Connect failed:', err);
        showToast('Failed to connect wallet', 'error');
        document.getElementById('connectBtn').textContent = 'Connect Wallet';
    }
}

async function switchToSongbird() {
    try {
        await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: '0x13' }]
        });
    } catch (err) {
        if (err.code === 4902) {
            await window.ethereum.request({
                method: 'wallet_addEthereumChain',
                params: [{
                    chainId: '0x13',
                    chainName: 'Songbird',
                    nativeCurrency: { name: 'SGB', symbol: 'SGB', decimals: 18 },
                    rpcUrls: [SONGBIRD_RPC],
                    blockExplorerUrls: ['https://songbird-explorer.flare.network']
                }]
            });
        }
    }
}

function handleAccountChange(accounts) {
    if (accounts.length === 0) {
        isConnected = false;
        userAddress = null;
        document.getElementById('connectBtn').textContent = 'Connect Wallet';
        document.getElementById('connectBtn').classList.remove('connected');
    } else {
        userAddress = accounts[0];
        document.getElementById('connectBtn').textContent = formatAddress(userAddress);
        loadBalances();
        loadUserNfts();
    }
}

// ==================== LOAD DATA ====================
async function loadBalances() {
    if (!isConnected) return;
    
    try {
        const [sgbBal, pondBal] = await Promise.all([
            provider.getBalance(userAddress),
            new ethers.Contract(CONTRACTS.pondToken, ERC20_ABI, provider).balanceOf(userAddress)
        ]);
        
        document.getElementById('sgbBal').textContent = parseFloat(ethers.utils.formatEther(sgbBal)).toFixed(2);
        document.getElementById('pondBal').textContent = formatNumber(parseFloat(ethers.utils.formatEther(pondBal)));
    } catch (err) {
        console.error('Load balances failed:', err);
    }
}

async function loadCollections() {
    const grid = document.getElementById('collectionsGrid');
    grid.innerHTML = '';
    grid.style.display = ''; // Reset to CSS default (grid)
    
    for (const col of COLLECTIONS) {
        const card = createCollectionCard(col);
        grid.appendChild(card);
    }
    
    // Load floor prices in background
    loadCollectionFloors();
}

function createCollectionCard(collection) {
    const card = document.createElement('div');
    card.className = 'collection-card';
    card.style.cursor = 'pointer';
    card.dataset.address = collection.address;
    
    card.innerHTML = `
        <div class="collection-banner">
            <img src="${collection.image}" alt="${collection.name}" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><rect fill=%22%231a1a2e%22 width=%22100%22 height=%22100%22/></svg>'">
        </div>
        <div class="collection-info">
            <div class="collection-name">${collection.name}</div>
            <div class="collection-desc">${collection.description}</div>
            <div class="collection-stats">
                <div class="col-stat">
                    <span class="col-stat-value">${formatNumber(collection.supply)}</span>
                    <span class="col-stat-label">Items</span>
                </div>
                <div class="col-stat">
                    <span class="col-stat-value floor-price" data-collection="${collection.address}">--</span>
                    <span class="col-stat-label">Floor</span>
                </div>
                <div class="col-stat">
                    <span class="col-stat-value volume-stat" data-collection="${collection.address}">--</span>
                    <span class="col-stat-label">Volume</span>
                </div>
            </div>
            <div class="multiplier-badge">🔥 LP Boost Eligible</div>
        </div>
    `;
    
    // Click handler to open collection view
    card.addEventListener('click', () => openCollectionView(collection));
    
    return card;
}

// Load floor prices for all collections
async function loadCollectionFloors() {
    console.log('Loading collection floors...');
    if (CONTRACTS.marketplace === '0x0000000000000000000000000000000000000000') {
        console.log('Marketplace not set');
        return;
    }
    
    // Use read-only provider if wallet not connected
    const readProvider = provider || new ethers.providers.JsonRpcProvider(SONGBIRD_RPC);
    
    // Load total staked first (separate from marketplace)
    if (CONTRACTS.nftStaking !== '0x0000000000000000000000000000000000000000') {
        try {
            const stakingContract = new ethers.Contract(CONTRACTS.nftStaking, NFT_STAKING_ABI, readProvider);
            const totalStaked = await stakingContract.totalStakedNFTs();
            console.log('Total staked:', totalStaked.toString());
            document.getElementById('totalStaked').textContent = formatNumber(totalStaked.toNumber());
        } catch (err) {
            console.error('Error loading total staked:', err);
        }
    }
    
    const marketplace = new ethers.Contract(CONTRACTS.marketplace, MARKETPLACE_ABI, readProvider);
    
    // Load overall volume stats
    try {
        const [volumeSGB, volumePOND, sales] = await marketplace.getStats();
        const totalVolume = parseFloat(ethers.utils.formatEther(volumeSGB));
        console.log('Total volume:', totalVolume);
        document.getElementById('totalVolume').textContent = totalVolume > 0 ? formatNumber(totalVolume) + ' SGB' : '0 SGB';
    } catch (err) {
        console.error('Error loading volume:', err);
    }
    
    const currentBlock = await readProvider.getBlockNumber();
    
    // Load floor for each collection in parallel
    await Promise.all(COLLECTIONS.map(async (col) => {
        try {
            // Scan multiple chunks to find all historical listings
            const allTokenIds = new Set();
            const chunkSize = 5000;
            const chunksToScan = 20; // ~100k blocks, roughly 2-3 days
            
            // Scan chunks in parallel for speed
            const chunkPromises = [];
            for (let i = 0; i < chunksToScan; i++) {
                const endBlock = currentBlock - (i * chunkSize);
                const startBlock = Math.max(0, endBlock - chunkSize);
                if (startBlock <= 0) break;
                
                chunkPromises.push(
                    readProvider.getLogs({
                        address: CONTRACTS.marketplace,
                        topics: [
                            ethers.utils.id('Listed(address,uint256,address,uint256,uint256)'),
                            ethers.utils.hexZeroPad(col.address, 32)
                        ],
                        fromBlock: startBlock,
                        toBlock: endBlock
                    }).catch(() => [])
                );
            }
            
            const chunkResults = await Promise.all(chunkPromises);
            chunkResults.forEach(logs => {
                logs.forEach(l => allTokenIds.add(parseInt(l.topics[2], 16)));
            });
            
            console.log(`${col.name}: found ${allTokenIds.size} potential listings from ${chunksToScan} chunks`);
            
            if (allTokenIds.size === 0) return;
            
            // Check active listings in parallel
            const tokenIds = [...allTokenIds];
            const results = await Promise.all(tokenIds.map(async (tokenId) => {
                try {
                    const [seller, priceSGB, pricePOND, active] = await marketplace.getListing(col.address, tokenId);
                    if (active && priceSGB.gt(0)) {
                        return parseFloat(ethers.utils.formatEther(priceSGB));
                    }
                } catch {}
                return null;
            }));
            
            const prices = results.filter(p => p !== null);
            console.log(`${col.name}: ${prices.length} active listings`);
            
            if (prices.length > 0) {
                const floor = Math.min(...prices);
                const floorEl = document.querySelector(`.floor-price[data-collection="${col.address}"]`);
                if (floorEl) floorEl.textContent = floor.toFixed(1) + ' SGB';
            }
        } catch (err) {
            console.error(`Error loading floor for ${col.name}:`, err);
        }
    }));
    
    console.log('Floor loading complete');
}

async function loadUserNfts() {
    if (!isConnected) {
        document.getElementById('noNftsMsg').innerHTML = '<p>Connect wallet to view your NFTs</p>';
        return;
    }
    
    const grid = document.getElementById('myNftsGrid');
    grid.innerHTML = '<div class="empty-state"><p>Loading...</p></div>';
    
    userNfts = {};
    COLLECTIONS.forEach(col => userNfts[col.address] = []);
    
    // Run ALL queries in parallel - wallet NFTs, staked NFTs, listed NFTs
    const [walletNfts, stakedNfts, listedNfts] = await Promise.all([
        loadWalletNfts(),
        loadStakedNftsForUser(),
        loadListedNftsForUser()
    ]);
    
    // Combine all
    const allNfts = [
        ...walletNfts.map(n => ({ ...n, isStaked: false, isListed: false })),
        ...stakedNfts.map(n => ({ ...n, isStaked: true, isListed: false })),
        ...listedNfts.map(n => ({ ...n, isStaked: false, isListed: true }))
    ];
    
    // Render
    if (allNfts.length === 0) {
        grid.innerHTML = '<div class="empty-state"><p>No NFTs found</p></div>';
    } else {
        grid.innerHTML = '';
        for (const nft of allNfts) {
            grid.appendChild(createNftCard(nft.collection, nft.tokenId, nft.isStaked, null, nft.isListed));
        }
    }
}

async function loadWalletNfts() {
    const results = [];
    
    // Query all collections in parallel
    const collectionPromises = COLLECTIONS.map(async (col) => {
        const contract = new ethers.Contract(col.address, ERC721_ABI, provider);
        const nfts = [];
        
        try {
            const balance = await contract.balanceOf(userAddress);
            console.log(`${col.name}: balance = ${balance.toString()}`);
            if (balance.eq(0)) return nfts;
            
            // Try enumerable - parallel fetch all at once
            try {
                const indices = Array.from({ length: Math.min(balance.toNumber(), 100) }, (_, i) => i);
                const tokens = await Promise.all(
                    indices.map(i => contract.tokenOfOwnerByIndex(userAddress, i).catch(() => null))
                );
                for (const tokenId of tokens) {
                    if (tokenId) {
                        const id = tokenId.toNumber();
                        userNfts[col.address].push(id);
                        nfts.push({ collection: col, tokenId: id });
                    }
                }
                console.log(`${col.name}: found ${nfts.length} via enumerable`);
            } catch (enumErr) {
                console.log(`${col.name}: not enumerable, using chunked transfer events`);
                // Not enumerable - use chunked transfer events
                const currentBlock = await provider.getBlockNumber();
                const chunkSize = 5000;
                const chunksToScan = 20;
                const potentialTokens = new Set();
                
                const chunkPromises = [];
                for (let i = 0; i < chunksToScan; i++) {
                    const endBlock = currentBlock - (i * chunkSize);
                    const startBlock = Math.max(0, endBlock - chunkSize);
                    if (startBlock <= 0) break;
                    
                    chunkPromises.push(
                        provider.getLogs({
                            address: col.address,
                            topics: [
                                ethers.utils.id('Transfer(address,address,uint256)'),
                                null,
                                ethers.utils.hexZeroPad(userAddress, 32)
                            ],
                            fromBlock: startBlock,
                            toBlock: endBlock
                        }).catch(() => [])
                    );
                }
                
                const chunkResults = await Promise.all(chunkPromises);
                chunkResults.forEach(logs => {
                    logs.forEach(l => potentialTokens.add(parseInt(l.topics[3], 16)));
                });
                
                console.log(`${col.name}: found ${potentialTokens.size} potential tokens from events`);
                
                // Check ownership in parallel
                const tokenArray = [...potentialTokens];
                const owners = await Promise.all(
                    tokenArray.map(id => contract.ownerOf(id).catch(() => null))
                );
                
                tokenArray.forEach((tokenId, i) => {
                    if (owners[i] && owners[i].toLowerCase() === userAddress.toLowerCase()) {
                        userNfts[col.address].push(tokenId);
                        nfts.push({ collection: col, tokenId });
                    }
                });
                console.log(`${col.name}: confirmed ${nfts.length} owned`);
            }
        } catch (err) {
            console.error(`Error loading ${col.name}:`, err.message);
        }
        
        return nfts;
    });
    
    const allResults = await Promise.all(collectionPromises);
    return allResults.flat();
}

async function loadStakedNftsForUser() {
    if (CONTRACTS.nftStaking === '0x0000000000000000000000000000000000000000') return [];
    
    const stakingContract = new ethers.Contract(CONTRACTS.nftStaking, NFT_STAKING_ABI, provider);
    const results = [];
    
    // Query all collections in parallel
    const stakedPromises = COLLECTIONS.map(async (col) => {
        try {
            const tokens = await stakingContract.getStakedTokens(userAddress, col.address);
            return tokens.map(t => ({ collection: col, tokenId: t.toNumber() }));
        } catch {
            return [];
        }
    });
    
    const allResults = await Promise.all(stakedPromises);
    return allResults.flat();
}

async function loadListedNftsForUser() {
    if (CONTRACTS.marketplace === '0x0000000000000000000000000000000000000000') return [];
    
    const marketplace = new ethers.Contract(CONTRACTS.marketplace, MARKETPLACE_ABI, provider);
    
    try {
        // Get listing events for user using chunked scanning
        const currentBlock = await provider.getBlockNumber();
        const chunkSize = 5000;
        const chunksToScan = 20;
        const uniqueListings = new Map();
        
        const chunkPromises = [];
        for (let i = 0; i < chunksToScan; i++) {
            const endBlock = currentBlock - (i * chunkSize);
            const startBlock = Math.max(0, endBlock - chunkSize);
            if (startBlock <= 0) break;
            
            chunkPromises.push(
                provider.getLogs({
                    address: CONTRACTS.marketplace,
                    topics: [
                        ethers.utils.id('Listed(address,uint256,address,uint256,uint256)'),
                        null, null,
                        ethers.utils.hexZeroPad(userAddress, 32)
                    ],
                    fromBlock: startBlock,
                    toBlock: endBlock
                }).catch(() => [])
            );
        }
        
        const chunkResults = await Promise.all(chunkPromises);
        chunkResults.forEach(logs => {
            logs.forEach(log => {
                const collectionAddress = '0x' + log.topics[1].slice(26);
                const tokenId = parseInt(log.topics[2], 16);
                const key = `${collectionAddress.toLowerCase()}-${tokenId}`;
                uniqueListings.set(key, { collectionAddress, tokenId });
            });
        });
        
        // Check all unique listings in parallel
        const listingChecks = [...uniqueListings.values()].map(async ({ collectionAddress, tokenId }) => {
            try {
                const [seller, , , active] = await marketplace.getListing(collectionAddress, tokenId);
                if (active && seller.toLowerCase() === userAddress.toLowerCase()) {
                    const col = COLLECTIONS.find(c => c.address.toLowerCase() === collectionAddress.toLowerCase());
                    if (col) return { collection: col, tokenId };
                }
            } catch {}
            return null;
        });
        
        const checked = await Promise.all(listingChecks);
        return checked.filter(Boolean);
    } catch (err) {
        console.error('Error loading listings:', err.message);
        return [];
    }
}

async function loadStakedNfts() {
    if (!isConnected) return;
    
    // Skip if staking contract not deployed
    if (CONTRACTS.nftStaking === '0x0000000000000000000000000000000000000000') {
        document.getElementById('myStakedCount').textContent = '0';
        document.getElementById('myMultiplier').textContent = '1.0x';
        document.getElementById('stakingRewards').textContent = '0 POND';
        return;
    }
    
    try {
        const stakingContract = new ethers.Contract(CONTRACTS.nftStaking, NFT_STAKING_ABI, provider);
        
        // Get user stats from contract
        const stats = await stakingContract.getUserStats(userAddress);
        const totalStaked = stats.totalStaked.toNumber();
        const pendingPond = parseFloat(ethers.utils.formatEther(stats.pendingPond));
        
        // Multiplier: base 1.0x + 0.001x per NFT (1 basis point), capped at +1.0x
        const nftBonus = Math.min(totalStaked, 1000); // Cap at 1000
        const multiplier = 1.0 + (nftBonus * 0.001);
        
        document.getElementById('myStakedCount').textContent = totalStaked;
        document.getElementById('myMultiplier').textContent = multiplier.toFixed(3) + 'x';
        document.getElementById('stakingRewards').textContent = pendingPond.toFixed(4) + ' POND';
        
        // Load staked tokens for grid
        const grid = document.getElementById('stakedNftsGrid');
        grid.innerHTML = '';
        
        for (const col of COLLECTIONS) {
            const stakedTokens = await stakingContract.getStakedTokens(userAddress, col.address);
            stakedNfts[col.address] = stakedTokens.map(t => t.toNumber());
            
            for (const tokenId of stakedNfts[col.address]) {
                const nftCard = createNftCard(col, tokenId, true);
                grid.appendChild(nftCard);
            }
        }
        
        if (totalStaked === 0) {
            grid.innerHTML = '<div class="empty-state"><p>No NFTs staked yet</p></div>';
        }
        
        // Update governance
        updateGovernancePower(0, totalStaked); // LP power loaded separately
        
    } catch (err) {
        console.error('Load staked NFTs failed:', err);
    }
}

async function loadLpPosition() {
    if (!isConnected) return;
    
    try {
        const pool = new ethers.Contract(CONTRACTS.pondPool, PONDPOOL_ABI, provider);
        const info = await pool.getUserInfo(userAddress);
        
        const poolShareBps = info.poolShareBps.toNumber();
        const sharePercent = (poolShareBps / 100).toFixed(2);
        
        document.getElementById('lpYourShare').textContent = sharePercent + '%';
        
        // Update governance with LP power
        const stakedCount = Object.values(stakedNfts).reduce((sum, arr) => sum + arr.length, 0);
        updateGovernancePower(poolShareBps, stakedCount);
        
    } catch (err) {
        console.error('Load LP position failed:', err);
    }
}

function createNftCard(collection, tokenId, isStaked, imageUrlOverride, isListed) {
    const card = document.createElement('div');
    card.className = 'nft-card';
    
    // Use thumbnail URI if available (PNG), otherwise use art from metadata
    let imageUrl = imageUrlOverride;
    if (!imageUrl) {
        if (collection.thumbnailUri) {
            // Use fast PNG thumbnails
            imageUrl = collection.thumbnailUri + tokenId + '.png';
        } else {
            // Get from metadata
            const metadata = collectionMetadata[collection.address];
            if (metadata && metadata[tokenId]) {
                imageUrl = metadata[tokenId].art || metadata[tokenId].image;
            }
            if (!imageUrl) {
                // Fallback to baseUri
                imageUrl = collection.baseUri + tokenId + '.png';
            }
        }
    }
    
    // Determine badge
    let badge = '';
    if (isStaked) {
        badge = '<div class="staked-badge">STAKED</div>';
    } else if (isListed) {
        badge = '<div class="listed-badge">LISTED</div>';
    }
    
    card.innerHTML = `
        <div class="nft-image">
            <img src="${imageUrl}" alt="${collection.name} #${tokenId}" loading="lazy" 
                 onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><rect fill=%22%231a1a2e%22 width=%22100%22 height=%22100%22/><text x=%2250%22 y=%2250%22 text-anchor=%22middle%22 fill=%22%23666%22 font-size=%2210%22>#${tokenId}</text></svg>'">
            ${badge}
        </div>
        <div class="nft-info">
            <div class="nft-name">${collection.name} #${tokenId}</div>
            <div class="nft-collection">${collection.symbol}</div>
        </div>
    `;
    
    card.style.cursor = 'pointer';
    card.addEventListener('click', () => openNftModal(collection, tokenId, isStaked, imageUrl));
    
    return card;
}

// ==================== TAB SWITCHING ====================
function switchTab(tab, updateHash = true) {
    // If viewing a collection and switching to collections, go back to main view
    if (tab === 'collections' && currentCollectionView) {
        closeCollectionView();
        return;
    }
    
    currentTab = tab;
    
    // Update URL hash
    if (updateHash) {
        history.pushState(null, '', `#${tab}`);
    }
    
    // Update nav buttons
    document.querySelectorAll('.nav-btn, .mobile-nav-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tab);
    });
    
    // Update content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.toggle('active', content.id === `tab-${tab}`);
    });
}

// ==================== COLLECTION VIEW ====================
let collectionLoadOffset = 0;
let collectionViewMode = 'all';
let isLoadingMore = false;
let collectionObserver = null;

function openCollectionView(collection) {
    currentCollectionView = collection;
    collectionLoadOffset = 0;
    collectionViewMode = 'all';
    isLoadingMore = false;
    
    const grid = document.getElementById('collectionsGrid');
    grid.style.display = 'block';
    
    grid.innerHTML = `
        <div class="collection-detail-view">
            <div class="collection-detail-header">
                <button class="back-btn" onclick="closeCollectionView()">← Back</button>
                <div class="collection-detail-info">
                    <img src="${collection.image}" class="collection-detail-avatar" alt="${collection.name}"
                         onerror="this.style.display='none'">
                    <div class="collection-detail-text">
                        <h2>${collection.name}</h2>
                        <p>${collection.description}</p>
                        <div class="collection-detail-stats">
                            <span>${formatNumber(collection.supply)} items</span>
                            <span class="multiplier-badge">🔥 LP Boost Eligible</span>
                        </div>
                    </div>
                </div>
            </div>
            <div class="collection-detail-filters">
                <div class="view-toggle">
                    <button class="view-btn active" data-view="all" onclick="switchCollectionView('all')">All</button>
                    <button class="view-btn" data-view="listings" onclick="switchCollectionView('listings')">Listings</button>
                </div>
                <input type="text" placeholder="Jump to ID..." class="search-input" id="nftSearchInput">
                <button class="jump-btn" onclick="jumpToTokenId()">Go</button>
                <select id="listingSortSelect" onchange="sortListings(this.value)">
                    <option value="price-asc">Price: Low to High</option>
                    <option value="price-desc">Price: High to Low</option>
                    <option value="id-asc">ID: Low to High</option>
                    <option value="id-desc">ID: High to Low</option>
                </select>
            </div>
            <div class="collection-nfts-grid" id="collectionNftsGrid">
                <div class="empty-state"><p>Loading...</p></div>
            </div>
            <div id="scrollSentinel" style="height: 1px;"></div>
        </div>
    `;
    
    loadCollectionNfts(collection);
    setupInfiniteScroll();
    
    document.getElementById('nftSearchInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') jumpToTokenId();
    });
}

function setupInfiniteScroll() {
    if (collectionObserver) collectionObserver.disconnect();
    
    collectionObserver = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && !isLoadingMore && collectionViewMode === 'all') {
            loadMoreNfts();
        }
    }, { rootMargin: '200px' });
    
    const sentinel = document.getElementById('scrollSentinel');
    if (sentinel) collectionObserver.observe(sentinel);
}

function switchCollectionView(mode) {
    collectionViewMode = mode;
    collectionLoadOffset = 0;
    
    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.view === mode);
    });
    
    document.getElementById('collectionNftsGrid').innerHTML = '<div class="empty-state"><p>Loading...</p></div>';
    loadCollectionNfts(currentCollectionView);
}

async function jumpToTokenId() {
    const input = document.getElementById('nftSearchInput');
    const tokenId = parseInt(input.value);
    
    if (isNaN(tokenId) || tokenId < 1 || tokenId > currentCollectionView.supply) {
        showToast('Enter a valid token ID (1-' + currentCollectionView.supply + ')', 'error');
        return;
    }
    
    openNftModal(currentCollectionView, tokenId, false, null);
}

function closeCollectionView() {
    if (collectionObserver) collectionObserver.disconnect();
    currentCollectionView = null;
    loadCollections();
}

async function loadCollectionNfts(collection, append = false) {
    const grid = document.getElementById('collectionNftsGrid');
    const metadata = collectionMetadata[collection.address];
    
    if (!append) grid.innerHTML = '';
    
    if (collectionViewMode === 'listings') {
        await loadListedNfts(collection, grid);
        return;
    }
    
    if (!metadata) {
        grid.innerHTML = '<div class="empty-state"><p>Could not load collection data</p></div>';
        return;
    }
    
    const allTokenIds = Object.keys(metadata).map(id => parseInt(id)).sort((a, b) => a - b);
    const pageSize = 100;
    const tokenIds = allTokenIds.slice(collectionLoadOffset, collectionLoadOffset + pageSize);
    
    if (tokenIds.length === 0) return;
    
    for (const tokenId of tokenIds) {
        const nftData = metadata[tokenId];
        const card = document.createElement('div');
        card.className = 'nft-card';
        card.dataset.tokenId = tokenId;
        
        let imageUrl = collection.thumbnailUri 
            ? collection.thumbnailUri + tokenId + '.png'
            : (nftData?.art || nftData?.image || collection.baseUri + tokenId + '.png');
        
        card.innerHTML = `
            <div class="nft-image">
                <img src="${imageUrl}" alt="${collection.name} #${tokenId}" loading="lazy"
                     onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><rect fill=%22%231a1a2e%22 width=%22100%22 height=%22100%22/><text x=%2250%22 y=%2250%22 text-anchor=%22middle%22 fill=%22%23666%22 font-size=%2210%22>#${tokenId}</text></svg>'">
            </div>
            <div class="nft-info">
                <div class="nft-name">${collection.name} #${tokenId}</div>
                <div class="nft-collection">${collection.symbol}</div>
            </div>
        `;
        
        card.style.cursor = 'pointer';
        card.addEventListener('click', () => openNftModal(collection, tokenId, false, imageUrl));
        grid.appendChild(card);
    }
    
    collectionLoadOffset += pageSize;
}

async function loadMoreNfts() {
    if (isLoadingMore || !currentCollectionView) return;
    isLoadingMore = true;
    await loadCollectionNfts(currentCollectionView, true);
    isLoadingMore = false;
}

async function loadListedNfts(collection, grid) {
    grid.innerHTML = '<div class="empty-state"><p>Loading listings...</p></div>';
    
    const readProvider = provider || new ethers.providers.JsonRpcProvider(SONGBIRD_RPC);
    const marketplace = new ethers.Contract(CONTRACTS.marketplace, MARKETPLACE_ABI, readProvider);
    const metadata = collectionMetadata[collection.address];
    
    if (!metadata) {
        grid.innerHTML = '<div class="empty-state"><p>Could not load collection data</p></div>';
        return;
    }
    
    const currentBlock = await readProvider.getBlockNumber();
    
    // Scan multiple chunks in parallel
    const allTokenIds = new Set();
    const chunkSize = 5000;
    const chunksToScan = 20;
    
    const chunkPromises = [];
    for (let i = 0; i < chunksToScan; i++) {
        const endBlock = currentBlock - (i * chunkSize);
        const startBlock = Math.max(0, endBlock - chunkSize);
        if (startBlock <= 0) break;
        
        chunkPromises.push(
            readProvider.getLogs({
                address: CONTRACTS.marketplace,
                topics: [
                    ethers.utils.id('Listed(address,uint256,address,uint256,uint256)'),
                    ethers.utils.hexZeroPad(collection.address, 32)
                ],
                fromBlock: startBlock,
                toBlock: endBlock
            }).catch(() => [])
        );
    }
    
    const chunkResults = await Promise.all(chunkPromises);
    chunkResults.forEach(logs => {
        logs.forEach(l => allTokenIds.add(parseInt(l.topics[2], 16)));
    });
    
    const tokenIds = [...allTokenIds];
    
    if (tokenIds.length === 0) {
        grid.innerHTML = '<div class="empty-state"><p>No listings found</p></div>';
        return;
    }
    
    // Check all in parallel with batching to avoid rate limits
    const batchSize = 30;
    const listings = [];
    
    for (let i = 0; i < tokenIds.length; i += batchSize) {
        const batch = tokenIds.slice(i, i + batchSize);
        const results = await Promise.all(batch.map(async (tokenId) => {
            try {
                const [seller, priceSGB, pricePOND, active] = await marketplace.getListing(collection.address, tokenId);
                if (active) return { tokenId, seller, priceSGB, pricePOND };
            } catch {}
            return null;
        }));
        listings.push(...results.filter(Boolean));
    }
    
    grid.innerHTML = '';
    
    if (listings.length === 0) {
        grid.innerHTML = '<div class="empty-state"><p>No active listings</p></div>';
        return;
    }
    
    for (const listing of listings) {
        const tokenId = listing.tokenId;
        const nftData = metadata[tokenId];
        
        let imageUrl = collection.thumbnailUri
            ? collection.thumbnailUri + tokenId + '.png'
            : (nftData?.art || nftData?.image || collection.baseUri + tokenId + '.png');
        
        // Calculate price for sorting (use SGB if available, else POND/1000 as rough equivalent)
        let sortPrice = 0;
        if (listing.priceSGB.gt(0)) {
            sortPrice = parseFloat(ethers.utils.formatEther(listing.priceSGB));
        } else if (listing.pricePOND.gt(0)) {
            sortPrice = parseFloat(ethers.utils.formatEther(listing.pricePOND)) / 1000;
        }
        
        let priceText = '';
        if (listing.priceSGB.gt(0)) priceText = parseFloat(ethers.utils.formatEther(listing.priceSGB)).toFixed(2) + ' SGB';
        if (listing.pricePOND.gt(0)) {
            if (priceText) priceText += ' / ';
            priceText += formatNumber(parseFloat(ethers.utils.formatEther(listing.pricePOND))) + ' POND';
        }
        
        const card = document.createElement('div');
        card.className = 'nft-card';
        card.dataset.tokenId = tokenId;
        card.dataset.price = sortPrice;
        
        card.innerHTML = `
            <div class="nft-image">
                <img src="${imageUrl}" alt="${collection.name} #${tokenId}" loading="lazy"
                     onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><rect fill=%22%231a1a2e%22 width=%22100%22 height=%22100%22/><text x=%2250%22 y=%2250%22 text-anchor=%22middle%22 fill=%22%23666%22 font-size=%2210%22>#${tokenId}</text></svg>'">
                <div class="listed-badge">LISTED</div>
            </div>
            <div class="nft-info">
                <div class="nft-name">${collection.name} #${tokenId}</div>
                <div class="nft-price">${priceText}</div>
            </div>
        `;
        
        card.style.cursor = 'pointer';
        card.addEventListener('click', () => openNftModal(collection, tokenId, false, imageUrl));
        grid.appendChild(card);
    }
    
    // Default sort by price low to high
    sortListings('price-asc');
}

function filterCollectionNfts(collection, searchTerm) {
    const grid = document.getElementById('collectionNftsGrid');
    const cards = grid.querySelectorAll('.nft-card');
    
    cards.forEach(card => {
        const tokenId = card.dataset.tokenId;
        if (!searchTerm || tokenId.includes(searchTerm)) {
            card.style.display = '';
        } else {
            card.style.display = 'none';
        }
    });
}

function sortCollectionNfts(collection, sortBy) {
    const grid = document.getElementById('collectionNftsGrid');
    const cards = Array.from(grid.querySelectorAll('.nft-card'));
    
    cards.sort((a, b) => {
        const idA = parseInt(a.dataset.tokenId);
        const idB = parseInt(b.dataset.tokenId);
        
        switch (sortBy) {
            case 'id-asc':
                return idA - idB;
            case 'id-desc':
                return idB - idA;
            default:
                return idA - idB;
        }
    });
    
    cards.forEach(card => grid.appendChild(card));
}

function sortListings(sortBy) {
    const grid = document.getElementById('collectionNftsGrid');
    const cards = Array.from(grid.querySelectorAll('.nft-card'));
    
    cards.sort((a, b) => {
        const idA = parseInt(a.dataset.tokenId);
        const idB = parseInt(b.dataset.tokenId);
        const priceA = parseFloat(a.dataset.price || 0);
        const priceB = parseFloat(b.dataset.price || 0);
        
        switch (sortBy) {
            case 'price-asc':
                return priceA - priceB;
            case 'price-desc':
                return priceB - priceA;
            case 'id-asc':
                return idA - idB;
            case 'id-desc':
                return idB - idA;
            default:
                return priceA - priceB;
        }
    });
    
    cards.forEach(card => grid.appendChild(card));
}

function filterCollections(filter) {
    // For now just reload - can add more collections later
    loadCollections();
}

function sortCollections(sortBy) {
    console.log('Sort by:', sortBy);
}

// ==================== NFT MODAL ====================
async function openNftModal(collection, tokenId, isStaked, imageUrl) {
    const modal = document.getElementById('nftModal');
    
    // Use provided imageUrl or construct it
    if (!imageUrl) {
        const metadata = collectionMetadata[collection.address];
        if (metadata && metadata[tokenId]) {
            imageUrl = metadata[tokenId].art || metadata[tokenId].image;
        }
        if (!imageUrl) {
            if (collection.baseUri.includes('ipfs://')) {
                imageUrl = collection.baseUri.replace('ipfs://', 'https://ipfs.io/ipfs/') + tokenId + '.png';
            } else if (collection.baseUri.endsWith('/')) {
                imageUrl = collection.baseUri + tokenId + '.png';
            } else {
                imageUrl = collection.baseUri;
            }
        }
    }
    
    document.getElementById('modalNftImage').src = imageUrl;
    document.getElementById('modalNftName').textContent = `${collection.name} #${tokenId}`;
    document.getElementById('modalCollection').textContent = collection.name;
    
    // Clear traits (would load from metadata)
    const traitsEl = document.getElementById('modalTraits');
    const metadata = collectionMetadata[collection.address];
    if (metadata && metadata[tokenId] && metadata[tokenId].traits) {
        traitsEl.innerHTML = `<div class="trait-item"><span>Traits</span><span>${metadata[tokenId].traits}</span></div>`;
    } else {
        traitsEl.innerHTML = '';
    }
    
    const priceEl = document.getElementById('modalPrice');
    const actionsEl = document.getElementById('modalActions');
    
    // Check if listed on marketplace
    let listing = null;
    try {
        const marketplace = new ethers.Contract(CONTRACTS.marketplace, MARKETPLACE_ABI, provider);
        const [seller, priceSGB, pricePOND, active] = await marketplace.getListing(collection.address, tokenId);
        if (active) {
            listing = { seller, priceSGB, pricePOND };
        }
    } catch (err) {
        console.log('Could not fetch listing:', err.message);
    }
    
    if (listing) {
        // NFT is listed
        const sgbPrice = listing.priceSGB.gt(0) ? parseFloat(ethers.utils.formatEther(listing.priceSGB)).toFixed(2) + ' SGB' : null;
        const pondPrice = listing.pricePOND.gt(0) ? parseFloat(ethers.utils.formatEther(listing.pricePOND)).toFixed(0) + ' POND' : null;
        
        let priceText = '';
        if (sgbPrice && pondPrice) priceText = `${sgbPrice} or ${pondPrice}`;
        else if (sgbPrice) priceText = sgbPrice;
        else if (pondPrice) priceText = pondPrice;
        
        priceEl.textContent = priceText;
        
        const isOwner = isConnected && listing.seller.toLowerCase() === userAddress.toLowerCase();
        
        if (isOwner) {
            // Owner can cancel listing
            actionsEl.innerHTML = `
                <button class="modal-btn secondary" onclick="cancelListing('${collection.address}', ${tokenId})">Cancel Listing</button>
            `;
        } else {
            // Others can buy
            let buyButtons = '';
            if (listing.priceSGB.gt(0)) {
                buyButtons += `<button class="modal-btn primary" onclick="buyNft('${collection.address}', ${tokenId}, false)">Buy with SGB</button>`;
            }
            if (listing.pricePOND.gt(0)) {
                buyButtons += `<button class="modal-btn primary" onclick="buyNft('${collection.address}', ${tokenId}, true)">Buy with POND</button>`;
            }
            actionsEl.innerHTML = buyButtons;
        }
    } else if (isStaked) {
        // User's staked NFT
        priceEl.textContent = 'Staked';
        actionsEl.innerHTML = `
            <button class="modal-btn primary" onclick="unstakeNft('${collection.address}', ${tokenId})">Unstake</button>
        `;
    } else {
        // Check if user owns this NFT
        let isOwner = false;
        if (isConnected) {
            try {
                const nftContract = new ethers.Contract(collection.address, ERC721_ABI, provider);
                const owner = await nftContract.ownerOf(tokenId);
                isOwner = owner.toLowerCase() === userAddress.toLowerCase();
            } catch (err) {
                console.log('Could not check ownership:', err.message);
            }
        }
        
        priceEl.textContent = 'Not Listed';
        
        if (isOwner) {
            actionsEl.innerHTML = `
                <button class="modal-btn primary" onclick="stakeNft('${collection.address}', ${tokenId})">Stake for LP Boost</button>
                <button class="modal-btn secondary" onclick="listNft('${collection.address}', ${tokenId})">List for Sale</button>
            `;
        } else {
            actionsEl.innerHTML = `<p style="color: var(--text-muted);">Not for sale</p>`;
        }
    }
    
    // Clear history
    document.getElementById('historyList').innerHTML = '<div style="color: var(--text-muted); font-size: 13px;">No activity yet</div>';
    
    modal.classList.add('active');
}

function closeModal() {
    document.getElementById('nftModal').classList.remove('active');
}

// ==================== STAKING ACTIONS ====================
async function stakeNft(collectionAddress, tokenId) {
    if (!isConnected) {
        showToast('Connect wallet first', 'error');
        return;
    }
    
    if (CONTRACTS.nftStaking === '0x0000000000000000000000000000000000000000') {
        showToast('Staking contract coming soon', 'error');
        return;
    }
    
    // Get button and set loading state
    const actionsEl = document.getElementById('modalActions');
    const originalHtml = actionsEl.innerHTML;
    
    try {
        // Check if approval needed
        const nftContract = new ethers.Contract(collectionAddress, ERC721_ABI, signer);
        const isApproved = await nftContract.isApprovedForAll(userAddress, CONTRACTS.nftStaking);
        
        if (!isApproved) {
            actionsEl.innerHTML = `<button class="modal-btn primary" disabled>Approving...</button>`;
            const approveTx = await nftContract.setApprovalForAll(CONTRACTS.nftStaking, true);
            await approveTx.wait();
        }
        
        // Stake
        actionsEl.innerHTML = `<button class="modal-btn primary" disabled>Staking...</button>`;
        const stakingContract = new ethers.Contract(CONTRACTS.nftStaking, NFT_STAKING_ABI, signer);
        const tx = await stakingContract.stake(collectionAddress, tokenId);
        await tx.wait();
        
        showToast('NFT staked successfully!');
        closeModal();
        await loadUserNfts();
        await loadStakedNfts();
        
    } catch (err) {
        console.error('Stake failed:', err);
        showToast('Staking failed: ' + (err.reason || err.message), 'error');
        actionsEl.innerHTML = originalHtml; // Restore buttons on error
    }
}

async function unstakeNft(collectionAddress, tokenId) {
    if (!isConnected) return;
    
    // Get button and set loading state
    const actionsEl = document.getElementById('modalActions');
    const originalHtml = actionsEl.innerHTML;
    
    try {
        actionsEl.innerHTML = `<button class="modal-btn primary" disabled>Unstaking...</button>`;
        
        const stakingContract = new ethers.Contract(CONTRACTS.nftStaking, NFT_STAKING_ABI, signer);
        const tx = await stakingContract.unstake(collectionAddress, tokenId);
        await tx.wait();
        
        showToast('NFT unstaked successfully!');
        closeModal();
        await loadUserNfts();
        await loadStakedNfts();
        
    } catch (err) {
        console.error('Unstake failed:', err);
        showToast('Unstaking failed: ' + (err.reason || err.message), 'error');
        actionsEl.innerHTML = originalHtml; // Restore button on error
    }
}

async function stakeAllNfts() {
    if (!isConnected) {
        showToast('Connect wallet first', 'error');
        return;
    }
    
    if (CONTRACTS.nftStaking === '0x0000000000000000000000000000000000000000') {
        showToast('Staking contract coming soon', 'error');
        return;
    }
    
    try {
        showToast('Staking all NFTs...');
        
        const stakingContract = new ethers.Contract(CONTRACTS.nftStaking, NFT_STAKING_ABI, signer);
        
        for (const col of COLLECTIONS) {
            const tokens = userNfts[col.address] || [];
            if (tokens.length === 0) continue;
            
            // Approve if needed
            const nftContract = new ethers.Contract(col.address, ERC721_ABI, signer);
            const isApproved = await nftContract.isApprovedForAll(userAddress, CONTRACTS.nftStaking);
            
            if (!isApproved) {
                showToast(`Approving ${col.name}...`);
                const approveTx = await nftContract.setApprovalForAll(CONTRACTS.nftStaking, true);
                await approveTx.wait();
            }
            
            // Stake batch
            showToast(`Staking ${tokens.length} ${col.name}...`);
            const tx = await stakingContract.stakeBatch(col.address, tokens);
            await tx.wait();
        }
        
        showToast('All NFTs staked!');
        await loadUserNfts();
        await loadStakedNfts();
        
    } catch (err) {
        console.error('Stake all failed:', err);
        showToast('Staking failed: ' + (err.reason || err.message), 'error');
    }
}

async function unstakeAllNfts() {
    if (!isConnected) return;
    
    if (CONTRACTS.nftStaking === '0x0000000000000000000000000000000000000000') {
        showToast('Staking contract coming soon', 'error');
        return;
    }
    
    try {
        showToast('Unstaking all NFTs...');
        
        const btn = document.getElementById('unstakeAllBtn');
        const originalText = btn.textContent;
        btn.textContent = 'Unstaking...';
        btn.disabled = true;
        
        const stakingContract = new ethers.Contract(CONTRACTS.nftStaking, NFT_STAKING_ABI, signer);
        const tx = await stakingContract.unstakeAll();
        await tx.wait();
        
        showToast('All NFTs unstaked!');
        btn.textContent = originalText;
        btn.disabled = false;
        await loadUserNfts();
        await loadStakedNfts();
        
    } catch (err) {
        console.error('Unstake all failed:', err);
        showToast('Unstaking failed: ' + (err.reason || err.message), 'error');
        const btn = document.getElementById('unstakeAllBtn');
        if (btn) {
            btn.textContent = 'Unstake All';
            btn.disabled = false;
        }
    }
}

async function claimStakingRewards() {
    if (!isConnected) return;
    
    if (CONTRACTS.nftStaking === '0x0000000000000000000000000000000000000000') {
        showToast('Staking contract coming soon', 'error');
        return;
    }
    
    const btn = document.getElementById('claimStakeRewardsBtn');
    const originalText = btn.textContent;
    
    try {
        btn.textContent = 'Claiming...';
        btn.disabled = true;
        
        const stakingContract = new ethers.Contract(CONTRACTS.nftStaking, NFT_STAKING_ABI, signer);
        const tx = await stakingContract.claimRewards();
        await tx.wait();
        
        showToast('Rewards claimed!');
        btn.textContent = originalText;
        btn.disabled = false;
        await loadBalances();
        await loadStakedNfts();
        
    } catch (err) {
        console.error('Claim failed:', err);
        showToast('Claim failed: ' + (err.reason || err.message), 'error');
        btn.textContent = originalText;
        btn.disabled = false;
    }
}

// ==================== MARKETPLACE ACTIONS ====================
let currentListingNft = null;

function listNft(collectionAddress, tokenId) {
    if (!isConnected) {
        showToast('Connect wallet first', 'error');
        return;
    }
    
    // Store current NFT being listed
    currentListingNft = { collectionAddress, tokenId };
    
    // Find collection info
    const collection = COLLECTIONS.find(c => c.address.toLowerCase() === collectionAddress.toLowerCase());
    
    // Update modal
    document.getElementById('listingNftName').textContent = `${collection?.name || 'NFT'} #${tokenId}`;
    document.getElementById('listingPriceSGB').value = '';
    document.getElementById('listingPricePOND').value = '';
    
    // Show listing modal
    document.getElementById('listingModal').classList.add('active');
}

function closeListingModal() {
    document.getElementById('listingModal').classList.remove('active');
    currentListingNft = null;
}

async function confirmListing() {
    if (!currentListingNft) return;
    
    const priceSGBInput = document.getElementById('listingPriceSGB').value;
    const pricePONDInput = document.getElementById('listingPricePOND').value;
    
    const priceSGB = priceSGBInput ? ethers.utils.parseEther(priceSGBInput) : ethers.BigNumber.from(0);
    const pricePOND = pricePONDInput ? ethers.utils.parseEther(pricePONDInput) : ethers.BigNumber.from(0);
    
    if (priceSGB.isZero() && pricePOND.isZero()) {
        showToast('Set at least one price', 'error');
        return;
    }
    
    const btn = document.getElementById('confirmListingBtn');
    const originalText = btn.textContent;
    
    try {
        // Check approval
        const nftContract = new ethers.Contract(currentListingNft.collectionAddress, ERC721_ABI, signer);
        const isApproved = await nftContract.isApprovedForAll(userAddress, CONTRACTS.marketplace);
        
        if (!isApproved) {
            btn.textContent = 'Approving...';
            btn.disabled = true;
            const approveTx = await nftContract.setApprovalForAll(CONTRACTS.marketplace, true);
            await approveTx.wait();
        }
        
        // List NFT
        btn.textContent = 'Listing...';
        btn.disabled = true;
        
        const marketplace = new ethers.Contract(CONTRACTS.marketplace, MARKETPLACE_ABI, signer);
        const tx = await marketplace.listNFT(
            currentListingNft.collectionAddress,
            currentListingNft.tokenId,
            priceSGB,
            pricePOND
        );
        await tx.wait();
        
        showToast('NFT listed successfully!');
        closeListingModal();
        closeModal();
        await loadUserNfts();
        
    } catch (err) {
        console.error('Listing failed:', err);
        showToast('Listing failed: ' + (err.reason || err.message), 'error');
    } finally {
        btn.textContent = originalText;
        btn.disabled = false;
    }
}

async function buyNft(collectionAddress, tokenId, payWithPOND) {
    if (!isConnected) {
        showToast('Connect wallet first', 'error');
        return;
    }
    
    const actionsEl = document.getElementById('modalActions');
    const originalHtml = actionsEl.innerHTML;
    
    try {
        const marketplace = new ethers.Contract(CONTRACTS.marketplace, MARKETPLACE_ABI, signer);
        const [seller, priceSGB, pricePOND, active] = await marketplace.getListing(collectionAddress, tokenId);
        
        if (!active) {
            showToast('Listing no longer active', 'error');
            return;
        }
        
        if (payWithPOND) {
            actionsEl.innerHTML = `<button class="modal-btn primary" disabled>Approving POND...</button>`;
            
            // Approve POND
            const pondContract = new ethers.Contract(CONTRACTS.pondToken, ERC20_ABI, signer);
            const allowance = await pondContract.allowance(userAddress, CONTRACTS.marketplace);
            
            if (allowance.lt(pricePOND)) {
                const approveTx = await pondContract.approve(CONTRACTS.marketplace, pricePOND);
                await approveTx.wait();
            }
            
            actionsEl.innerHTML = `<button class="modal-btn primary" disabled>Buying...</button>`;
            const tx = await marketplace.buyWithPOND(collectionAddress, tokenId);
            await tx.wait();
        } else {
            actionsEl.innerHTML = `<button class="modal-btn primary" disabled>Buying...</button>`;
            const tx = await marketplace.buyWithSGB(collectionAddress, tokenId, { value: priceSGB });
            await tx.wait();
        }
        
        showToast('NFT purchased successfully!');
        closeModal();
        await loadUserNfts();
        
    } catch (err) {
        console.error('Purchase failed:', err);
        showToast('Purchase failed: ' + (err.reason || err.message), 'error');
        actionsEl.innerHTML = originalHtml;
    }
}

async function cancelListing(collectionAddress, tokenId) {
    if (!isConnected) return;
    
    const actionsEl = document.getElementById('modalActions');
    
    try {
        actionsEl.innerHTML = `<button class="modal-btn" disabled>Cancelling...</button>`;
        
        const marketplace = new ethers.Contract(CONTRACTS.marketplace, MARKETPLACE_ABI, signer);
        const tx = await marketplace.cancelListing(collectionAddress, tokenId);
        await tx.wait();
        
        showToast('Listing cancelled!');
        closeModal();
        await loadUserNfts();
        
    } catch (err) {
        console.error('Cancel failed:', err);
        showToast('Cancel failed: ' + (err.reason || err.message), 'error');
    }
}

// ==================== GOVERNANCE ====================
function updateGovernancePower(lpShareBps, stakedNftCount) {
    const lpPower = lpShareBps; // 1 bps = 1 power
    const nftPower = stakedNftCount * 100; // 100 power per NFT
    const totalPower = lpPower + nftPower;
    
    document.getElementById('govVotingPower').textContent = formatNumber(totalPower);
    document.getElementById('govLpPower').textContent = formatNumber(lpPower);
    document.getElementById('govNftPower').textContent = formatNumber(nftPower);
}

// ==================== UTILITIES ====================
function formatAddress(address) {
    return address.slice(0, 6) + '...' + address.slice(-4);
}

function formatNumber(num) {
    if (num >= 1000000) return (num / 1000000).toFixed(2) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toLocaleString();
}

function showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 4000);
}
