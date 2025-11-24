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
    
    // Check if already connected
    if (window.ethereum && window.ethereum.selectedAddress) {
        await connectWallet();
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
}

function createCollectionCard(collection) {
    const card = document.createElement('div');
    card.className = 'collection-card';
    card.style.cursor = 'pointer';
    
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
                    <span class="col-stat-value">--</span>
                    <span class="col-stat-label">Floor</span>
                </div>
                <div class="col-stat">
                    <span class="col-stat-value">--</span>
                    <span class="col-stat-label">Volume</span>
                </div>
            </div>
            <div class="multiplier-badge">+${collection.multiplier}% LP Multiplier</div>
        </div>
    `;
    
    // Click handler to open collection view
    card.addEventListener('click', () => openCollectionView(collection));
    
    return card;
}

async function loadUserNfts() {
    if (!isConnected) {
        document.getElementById('noNftsMsg').innerHTML = '<p>Connect wallet to view your NFTs</p>';
        return;
    }
    
    const grid = document.getElementById('myNftsGrid');
    grid.innerHTML = '<div class="empty-state"><p>Loading NFTs...</p></div>';
    
    userNfts = {};
    let allNfts = [];
    
    console.log('Loading NFTs for wallet:', userAddress);
    
    for (const col of COLLECTIONS) {
        try {
            console.log(`Checking ${col.name}...`);
            const contract = new ethers.Contract(col.address, ERC721_ABI, provider);
            const balance = await contract.balanceOf(userAddress);
            const count = balance.toNumber();
            
            console.log(`${col.name}: balance = ${count}`);
            
            userNfts[col.address] = [];
            
            if (count > 0) {
                // Try enumerable method first
                let useEnumerable = true;
                try {
                    await contract.tokenOfOwnerByIndex(userAddress, 0);
                } catch {
                    useEnumerable = false;
                    console.log(`${col.name}: Not enumerable, using Transfer event fallback`);
                }
                
                if (useEnumerable) {
                    // Use ERC721Enumerable
                    for (let i = 0; i < count && i < 100; i++) {
                        try {
                            const tokenId = await contract.tokenOfOwnerByIndex(userAddress, i);
                            userNfts[col.address].push(tokenId.toNumber());
                            allNfts.push({
                                collection: col,
                                tokenId: tokenId.toNumber()
                            });
                        } catch (err) {
                            console.log(`Error getting token ${i} from ${col.name}:`, err.message);
                            break;
                        }
                    }
                } else {
                    // Fallback: Use Transfer event logs to find user's tokens
                    try {
                        // Get Transfer events where user is recipient
                        const transferFilter = {
                            address: col.address,
                            topics: [
                                ethers.utils.id('Transfer(address,address,uint256)'),
                                null, // from (any)
                                ethers.utils.hexZeroPad(userAddress, 32) // to (user)
                            ],
                            fromBlock: 0,
                            toBlock: 'latest'
                        };
                        
                        console.log(`${col.name}: Fetching Transfer events...`);
                        const logs = await provider.getLogs(transferFilter);
                        console.log(`${col.name}: Found ${logs.length} incoming transfers`);
                        
                        // Get unique token IDs from logs
                        const potentialTokens = new Set();
                        for (const log of logs) {
                            const tokenId = parseInt(log.topics[3], 16);
                            potentialTokens.add(tokenId);
                        }
                        
                        console.log(`${col.name}: Checking ${potentialTokens.size} potential tokens...`);
                        
                        // Check current ownership
                        let found = 0;
                        for (const tokenId of potentialTokens) {
                            if (found >= count) break;
                            try {
                                const owner = await contract.ownerOf(tokenId);
                                if (owner.toLowerCase() === userAddress.toLowerCase()) {
                                    userNfts[col.address].push(tokenId);
                                    allNfts.push({
                                        collection: col,
                                        tokenId: tokenId
                                    });
                                    found++;
                                    console.log(`Found owned NFT: ${col.name} #${tokenId}`);
                                }
                            } catch {
                                // Token might be burned or error
                            }
                        }
                    } catch (eventErr) {
                        console.log(`${col.name}: Event log query failed, trying metadata fallback...`);
                        // Final fallback: check tokens from metadata in parallel batches
                        const metadata = collectionMetadata[col.address];
                        if (metadata) {
                            const tokenIds = Object.keys(metadata).map(id => parseInt(id));
                            let found = 0;
                            const batchSize = 50; // Check 50 at a time
                            console.log(`${col.name}: Scanning ${tokenIds.length} tokens for ${count} owned...`);
                            
                            for (let i = 0; i < tokenIds.length && found < count; i += batchSize) {
                                const batch = tokenIds.slice(i, i + batchSize);
                                const results = await Promise.all(
                                    batch.map(async (tokenId) => {
                                        try {
                                            const owner = await contract.ownerOf(tokenId);
                                            return { tokenId, owned: owner.toLowerCase() === userAddress.toLowerCase() };
                                        } catch {
                                            return { tokenId, owned: false };
                                        }
                                    })
                                );
                                
                                for (const result of results) {
                                    if (result.owned && found < count) {
                                        userNfts[col.address].push(result.tokenId);
                                        allNfts.push({
                                            collection: col,
                                            tokenId: result.tokenId
                                        });
                                        found++;
                                        console.log(`Found owned NFT: ${col.name} #${result.tokenId} (${found}/${count})`);
                                    }
                                }
                                
                                if ((i + batchSize) % 500 === 0) {
                                    console.log(`${col.name}: Checked ${Math.min(i + batchSize, tokenIds.length)}/${tokenIds.length}...`);
                                }
                            }
                        }
                    }
                }
            }
        } catch (err) {
            console.error(`Error loading NFTs from ${col.name}:`, err);
        }
    }
    
    console.log('Total NFTs found:', allNfts.length);
    
    // Render NFTs
    if (allNfts.length === 0) {
        grid.innerHTML = '<div class="empty-state"><p>No NFTs found in your wallet</p></div>';
    } else {
        grid.innerHTML = '';
        for (const nft of allNfts) {
            const nftCard = createNftCard(nft.collection, nft.tokenId, false);
            grid.appendChild(nftCard);
        }
    }
}

async function loadStakedNfts() {
    if (!isConnected) return;
    
    // Skip if staking contract not deployed
    if (CONTRACTS.nftStaking === '0x0000000000000000000000000000000000000000') {
        document.getElementById('myStakedCount').textContent = '0';
        document.getElementById('myMultiplier').textContent = '1.0x';
        return;
    }
    
    try {
        const stakingContract = new ethers.Contract(CONTRACTS.nftStaking, NFT_STAKING_ABI, provider);
        
        let totalStaked = 0;
        let totalMultiplier = 100; // Base 1.0x = 100%
        
        const grid = document.getElementById('stakedNftsGrid');
        grid.innerHTML = '';
        
        for (const col of COLLECTIONS) {
            const stakedTokens = await stakingContract.getStakedTokens(userAddress, col.address);
            stakedNfts[col.address] = stakedTokens.map(t => t.toNumber());
            totalStaked += stakedTokens.length;
            totalMultiplier += stakedTokens.length * col.multiplier;
            
            for (const tokenId of stakedNfts[col.address]) {
                const nftCard = createNftCard(col, tokenId, true);
                grid.appendChild(nftCard);
            }
        }
        
        document.getElementById('myStakedCount').textContent = totalStaked;
        document.getElementById('myMultiplier').textContent = (totalMultiplier / 100).toFixed(1) + 'x';
        
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

function createNftCard(collection, tokenId, isStaked) {
    const card = document.createElement('div');
    card.className = 'nft-card';
    
    // Use thumbnail URI if available (PNG), otherwise use art from metadata
    let imageUrl;
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
    
    card.innerHTML = `
        <div class="nft-image">
            <img src="${imageUrl}" alt="${collection.name} #${tokenId}" loading="lazy" 
                 onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><rect fill=%22%231a1a2e%22 width=%22100%22 height=%22100%22/><text x=%2250%22 y=%2250%22 text-anchor=%22middle%22 fill=%22%23666%22 font-size=%2210%22>#${tokenId}</text></svg>'">
            ${isStaked ? '<div class="staked-badge">STAKED</div>' : ''}
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
function switchTab(tab) {
    // If viewing a collection and switching to collections, go back to main view
    if (tab === 'collections' && currentCollectionView) {
        closeCollectionView();
        return;
    }
    
    currentTab = tab;
    
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
function openCollectionView(collection) {
    currentCollectionView = collection;
    
    const grid = document.getElementById('collectionsGrid');
    
    // Change parent to block display for proper layout
    grid.style.display = 'block';
    
    // Create collection detail view
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
                            <span class="multiplier-badge">+${collection.multiplier}% LP Multiplier</span>
                        </div>
                    </div>
                </div>
            </div>
            <div class="collection-detail-filters">
                <input type="text" placeholder="Search by ID..." class="search-input" id="nftSearchInput">
                <select id="nftSortSelect">
                    <option value="id-asc">ID: Low to High</option>
                    <option value="id-desc">ID: High to Low</option>
                    <option value="price-asc">Price: Low to High</option>
                    <option value="price-desc">Price: High to Low</option>
                </select>
            </div>
            <div class="collection-nfts-grid" id="collectionNftsGrid">
                <div class="empty-state"><p>Loading NFTs...</p></div>
            </div>
        </div>
    `;
    
    // Load NFTs for this collection
    loadCollectionNfts(collection);
    
    // Setup search
    document.getElementById('nftSearchInput').addEventListener('input', (e) => {
        filterCollectionNfts(collection, e.target.value);
    });
    
    // Setup sort
    document.getElementById('nftSortSelect').addEventListener('change', (e) => {
        sortCollectionNfts(collection, e.target.value);
    });
}

function closeCollectionView() {
    currentCollectionView = null;
    loadCollections();
}

async function loadCollectionNfts(collection) {
    const grid = document.getElementById('collectionNftsGrid');
    const metadata = collectionMetadata[collection.address];
    
    if (!metadata) {
        grid.innerHTML = '<div class="empty-state"><p>Could not load collection data</p></div>';
        return;
    }
    
    grid.innerHTML = '';
    
    // Show first 100 NFTs
    const tokenIds = Object.keys(metadata).slice(0, 100);
    
    for (const tokenIdStr of tokenIds) {
        const tokenId = parseInt(tokenIdStr);
        const nftData = metadata[tokenIdStr];
        
        const card = document.createElement('div');
        card.className = 'nft-card';
        card.dataset.tokenId = tokenId;
        
        // Use thumbnail URI if available (PNG), otherwise use art from metadata
        let imageUrl;
        if (collection.thumbnailUri) {
            imageUrl = collection.thumbnailUri + tokenId + '.png';
        } else {
            imageUrl = nftData.art || nftData.image || collection.baseUri + tokenId + '.png';
        }
        
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

function filterCollections(filter) {
    // For now just reload - can add more collections later
    loadCollections();
}

function sortCollections(sortBy) {
    console.log('Sort by:', sortBy);
}

// ==================== NFT MODAL ====================
function openNftModal(collection, tokenId, isStaked, imageUrl) {
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
    
    // Set price section
    document.getElementById('modalPrice').textContent = 'Not Listed';
    
    // Set actions based on ownership and staking status
    const actionsEl = document.getElementById('modalActions');
    
    if (isStaked) {
        actionsEl.innerHTML = `
            <button class="modal-btn primary" onclick="unstakeNft('${collection.address}', ${tokenId})">Unstake</button>
        `;
    } else {
        actionsEl.innerHTML = `
            <button class="modal-btn primary" onclick="stakeNft('${collection.address}', ${tokenId})">Stake for LP Boost</button>
            <button class="modal-btn secondary" onclick="listNft('${collection.address}', ${tokenId})">List for Sale</button>
        `;
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
    
    try {
        showToast('Staking NFT...');
        
        // Approve if needed
        const nftContract = new ethers.Contract(collectionAddress, ERC721_ABI, signer);
        const isApproved = await nftContract.isApprovedForAll(userAddress, CONTRACTS.nftStaking);
        
        if (!isApproved) {
            const approveTx = await nftContract.setApprovalForAll(CONTRACTS.nftStaking, true);
            await approveTx.wait();
        }
        
        // Stake
        const stakingContract = new ethers.Contract(CONTRACTS.nftStaking, NFT_STAKING_ABI, signer);
        const tx = await stakingContract.stake(collectionAddress, [tokenId]);
        await tx.wait();
        
        showToast('NFT staked successfully!');
        closeModal();
        await loadUserNfts();
        await loadStakedNfts();
        
    } catch (err) {
        console.error('Stake failed:', err);
        showToast('Staking failed: ' + (err.reason || err.message), 'error');
    }
}

async function unstakeNft(collectionAddress, tokenId) {
    if (!isConnected) return;
    
    try {
        showToast('Unstaking NFT...');
        
        const stakingContract = new ethers.Contract(CONTRACTS.nftStaking, NFT_STAKING_ABI, signer);
        const tx = await stakingContract.unstake(collectionAddress, [tokenId]);
        await tx.wait();
        
        showToast('NFT unstaked successfully!');
        closeModal();
        await loadUserNfts();
        await loadStakedNfts();
        
    } catch (err) {
        console.error('Unstake failed:', err);
        showToast('Unstaking failed: ' + (err.reason || err.message), 'error');
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
    
    showToast('Stake All coming soon');
}

async function unstakeAllNfts() {
    if (!isConnected) return;
    showToast('Unstake All coming soon');
}

async function claimStakingRewards() {
    if (!isConnected) return;
    
    if (CONTRACTS.nftStaking === '0x0000000000000000000000000000000000000000') {
        showToast('Staking contract coming soon', 'error');
        return;
    }
    
    try {
        showToast('Claiming rewards...');
        
        const stakingContract = new ethers.Contract(CONTRACTS.nftStaking, NFT_STAKING_ABI, signer);
        const tx = await stakingContract.claimRewards();
        await tx.wait();
        
        showToast('Rewards claimed!');
        await loadBalances();
        
    } catch (err) {
        console.error('Claim failed:', err);
        showToast('Claim failed: ' + (err.reason || err.message), 'error');
    }
}

// ==================== MARKETPLACE ACTIONS ====================
async function listNft(collectionAddress, tokenId) {
    if (!isConnected) return;
    
    if (CONTRACTS.marketplace === '0x0000000000000000000000000000000000000000') {
        showToast('Marketplace coming soon', 'error');
        return;
    }
    
    // TODO: Show listing modal with price input
    showToast('Listing coming soon');
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
