// ==================== CONFIG ====================
const INDEXER_URL = 'https://toadz-indexer-production.up.railway.app';

// RPC - must use HTTPS for browser
const SONGBIRD_RPC = 'https://songbird-api.flare.network/ext/C/rpc';

// IPFS gateway for converting ipfs:// URLs
function ipfsToHttp(url) {
    if (!url) return '';
    if (url.startsWith('ipfs://')) {
        return url.replace('ipfs://', 'https://dweb.link/ipfs/');
    }
    return url;
}

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
    loadRecentActivity(); // Don't await - load in background
    
    // Handle URL hash routing
    handleHashRoute();
    window.addEventListener('hashchange', handleHashRoute);
    
    // Initialize notification badge (hide when 0)
    updateNotificationBadge(0);
    
    // Check if already connected - use eth_accounts for reliability
    const ethereum = window.ethereum || window.bifrost;
    if (ethereum) {
        try {
            const accounts = await ethereum.request({ method: 'eth_accounts' });
            if (accounts && accounts.length > 0) {
                await connectWallet();
            }
        } catch (e) {
            console.log('Auto-connect check failed:', e.message);
        }
    }
}

// Notification system
let notificationCounts = { red: 0, green: 0 };

function updateNotificationBadge(redCount, greenCount) {
    const badge = document.getElementById('notifBadge');
    const total = redCount + greenCount;
    
    if (total === 0) {
        badge.style.display = 'none';
    } else {
        badge.style.display = 'flex';
        badge.textContent = total;
        // Red takes priority (money incoming), else green (confirmations)
        badge.style.background = redCount > 0 ? '#e74c3c' : '#00d4aa';
    }
    
    notificationCounts = { red: redCount, green: greenCount };
}

async function checkForNewOffers() {
    if (!isConnected) return;
    
    try {
        const response = await fetch(`${INDEXER_URL}/user/${userAddress}/notifications/unread`);
        if (!response.ok) throw new Error('Indexer unavailable');
        
        const data = await response.json();
        updateNotificationBadge(data.counts.red || 0, data.counts.green || 0);
        
    } catch (err) {
        console.log('Could not check notifications:', err.message);
        // Fallback: just hide badge if indexer is down
        updateNotificationBadge(0, 0);
    }
}

function handleHashRoute() {
    const hash = window.location.hash.slice(1); // Remove #
    const validTabs = ['collections', 'my-nfts', 'staking', 'lp', 'leaderboard', 'governance'];
    
    // Handle collection routes: #collection/0x123...
    if (hash.startsWith('collection/')) {
        const address = hash.split('/')[1];
        const collection = COLLECTIONS.find(c => c.address.toLowerCase() === address.toLowerCase());
        if (collection) {
            switchTab('collections', false);
            setTimeout(() => openCollectionView(collection), 100);
            return;
        }
    }
    
    // Handle user profile routes: #user/0x123...
    if (hash.startsWith('user/')) {
        const address = hash.split('/')[1];
        if (ethers.utils.isAddress(address)) {
            switchTab('collections', false);
            setTimeout(() => openUserProfile(address), 100);
            return;
        }
    }
    
    if (hash && validTabs.includes(hash)) {
        switchTab(hash, false); // false = don't update hash again
    }
}

// ==================== LOAD METADATA ====================
let collectionRarity = {}; // Store rarity scores per collection

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
                    
                    // Calculate rarity scores (skip if noRarity flag)
                    if (!col.noRarity) {
                        calculateRarity(col.address, data);
                    }
                }
            } catch (err) {
                console.log(`Could not load metadata for ${col.name}:`, err.message);
            }
        } else {
            // No jsonFile - generate basic metadata from supply
            const obj = {};
            for (let i = 1; i <= col.supply; i++) {
                obj[i] = { id: i, name: `${col.name} #${i}` };
            }
            collectionMetadata[col.address] = obj;
        }
    }
}

// Calculate rarity scores for a collection
function calculateRarity(collectionAddress, metadata) {
    const tokenIds = Object.keys(metadata);
    const totalSupply = tokenIds.length;
    
    if (totalSupply === 0) return;
    
    // Count trait occurrences
    const traitCounts = {}; // { "trait_type:value": count }
    
    for (const tokenId of tokenIds) {
        const nft = metadata[tokenId];
        if (!nft.attributes) continue;
        
        for (const attr of nft.attributes) {
            const key = `${attr.trait_type}:${attr.value}`;
            traitCounts[key] = (traitCounts[key] || 0) + 1;
        }
    }
    
    // Calculate rarity score for each token
    const rarityScores = {};
    let maxScore = 0;
    let minScore = Infinity;
    
    for (const tokenId of tokenIds) {
        const nft = metadata[tokenId];
        let score = 0;
        
        if (nft.attributes) {
            for (const attr of nft.attributes) {
                const key = `${attr.trait_type}:${attr.value}`;
                const count = traitCounts[key];
                const percentage = count / totalSupply;
                // Rarity score = 1 / percentage (rarer = higher score)
                score += 1 / percentage;
            }
        }
        
        rarityScores[tokenId] = score;
        if (score > maxScore) maxScore = score;
        if (score < minScore && score > 0) minScore = score;
    }
    
    // Normalize scores to 1-100 and assign ranks
    const sortedTokens = Object.entries(rarityScores)
        .sort((a, b) => b[1] - a[1])
        .map(([tokenId], index) => ({ tokenId, rank: index + 1 }));
    
    const rankMap = {};
    for (const { tokenId, rank } of sortedTokens) {
        const rawScore = rarityScores[tokenId];
        const normalizedScore = maxScore > minScore 
            ? Math.round(((rawScore - minScore) / (maxScore - minScore)) * 99) + 1
            : 50;
        rankMap[tokenId] = { 
            score: normalizedScore, 
            rank,
            rawScore: Math.round(rawScore * 100) / 100
        };
    }
    
    collectionRarity[collectionAddress] = rankMap;
    console.log(`Calculated rarity for ${tokenIds.length} NFTs`);
}

// Get rarity tier based on rank percentage
function getRarityTier(rank, totalSupply) {
    const percentile = (rank / totalSupply) * 100;
    if (percentile <= 1) return { tier: 'Legendary', color: '#ffd700' };
    if (percentile <= 5) return { tier: 'Epic', color: '#a855f7' };
    if (percentile <= 15) return { tier: 'Rare', color: '#3b82f6' };
    if (percentile <= 35) return { tier: 'Uncommon', color: '#22c55e' };
    return { tier: 'Common', color: '#888' };
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
    // Check for any injected wallet (MetaMask, Bifrost, etc.)
    const ethereum = window.ethereum || window.bifrost;
    
    if (!ethereum) {
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        if (isMobile) {
            showToast('Open this site in Bifrost Wallet\'s browser to connect', 'error');
        } else {
            showToast('Please install MetaMask or Bifrost Wallet', 'error');
        }
        return;
    }
    
    try {
        const btn = document.getElementById('connectBtn');
        btn.textContent = 'Connecting...';
        
        // Request accounts
        const accounts = await ethereum.request({ method: 'eth_requestAccounts' });
        userAddress = accounts[0];
        
        // Check network
        const chainId = await ethereum.request({ method: 'eth_chainId' });
        if (parseInt(chainId, 16) !== SONGBIRD_CHAIN_ID) {
            await switchToSongbird();
        }
        
        // Setup provider
        provider = new ethers.providers.Web3Provider(ethereum);
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
        
        // Check for offers on user's listings
        checkForNewOffers();
        
        // Poll for new offers every 30 seconds
        setInterval(checkForNewOffers, 30000);
        
        // Listen for account changes
        ethereum.on('accountsChanged', handleAccountChange);
        ethereum.on('chainChanged', () => window.location.reload());
        
        showToast('Wallet connected');
        
    } catch (err) {
        console.error('Connect failed:', err);
        showToast('Failed to connect wallet', 'error');
        document.getElementById('connectBtn').textContent = 'Connect Wallet';
    }
}

async function switchToSongbird() {
    const ethereum = window.ethereum || window.bifrost;
    try {
        await ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: '0x13' }]
        });
    } catch (err) {
        if (err.code === 4902) {
            await ethereum.request({
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
    
    const lpBoostBadge = collection.stakeable ? '<div class="multiplier-badge">🔥 LP Boost Eligible</div>' : '';
    
    card.innerHTML = `
        <div class="collection-banner">
            <img src="${ipfsToHttp(collection.image)}" alt="${collection.name}" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><rect fill=%22%231a1a2e%22 width=%22100%22 height=%22100%22/></svg>'">
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
            ${lpBoostBadge}
        </div>
    `;
    
    // Click handler to open collection view
    card.addEventListener('click', () => openCollectionView(collection));
    
    return card;
}

// Load recent marketplace activity from indexer
async function loadRecentActivity() {
    const activityList = document.getElementById('activityList');
    
    try {
        const response = await fetch(`${INDEXER_URL}/activity?limit=20`);
        if (!response.ok) throw new Error('Indexer unavailable');
        
        const events = await response.json();
        
        if (events.length === 0) {
            activityList.innerHTML = '<div class="activity-loading">No recent activity</div>';
            return;
        }
        
        activityList.innerHTML = '';
        
        for (const event of events) {
            const item = createActivityItemFromIndexer(event);
            if (item) activityList.appendChild(item);
        }
        
    } catch (err) {
        console.log('Activity load failed:', err.message);
        activityList.innerHTML = '<div class="activity-loading">Could not load activity</div>';
    }
}

function createActivityItemFromIndexer(event) {
    const collection = COLLECTIONS.find(c => c.address.toLowerCase() === event.collection?.toLowerCase());
    if (!collection) return null;
    
    let typeLabel = '';
    let typeClass = '';
    let price = '';
    
    switch (event.event_type) {
        case 'sold':
            typeLabel = 'SALE';
            typeClass = 'sale';
            if (parseFloat(event.price_sgb) > 0) {
                price = parseFloat(event.price_sgb).toFixed(2) + ' SGB';
            } else if (parseFloat(event.price_pond) > 0) {
                price = formatNumber(parseFloat(event.price_pond)) + ' POND';
            }
            break;
        case 'listed':
            typeLabel = 'LISTED';
            typeClass = 'listing';
            if (parseFloat(event.price_sgb) > 0) {
                price = parseFloat(event.price_sgb).toFixed(2) + ' SGB';
            } else if (parseFloat(event.price_pond) > 0) {
                price = formatNumber(parseFloat(event.price_pond)) + ' POND';
            }
            break;
        case 'offer_accepted':
            typeLabel = 'OFFER ACCEPTED';
            typeClass = 'offer';
            if (parseFloat(event.price_sgb) > 0) {
                price = parseFloat(event.price_sgb).toFixed(2) + ' SGB';
            } else if (parseFloat(event.price_pond) > 0) {
                price = formatNumber(parseFloat(event.price_pond)) + ' POND';
            }
            break;
        case 'staked':
            typeLabel = 'STAKED';
            typeClass = 'staked';
            break;
        default:
            return null;
    }
    
    // Get image URL
    let imageUrl = collection.thumbnailUri 
        ? collection.thumbnailUri + event.token_id + (collection.imageExt || '.png')
        : collection.image;
    
    const item = document.createElement('div');
    item.className = 'activity-item';
    item.onclick = () => openNftModal(collection, event.token_id, false, imageUrl);
    
    item.innerHTML = `
        <div class="activity-icon">
            <img src="${imageUrl}" alt="${collection.name} #${event.token_id}" 
                 onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><rect fill=%22%231a1a2e%22 width=%22100%22 height=%22100%22/></svg>'">
        </div>
        <div class="activity-info">
            <div class="activity-left">
                <div class="activity-type ${typeClass}">${typeLabel}</div>
                <div class="activity-details">${collection.name} #${event.token_id}</div>
                ${price ? `<div class="activity-price">${price}</div>` : ''}
            </div>
            <div class="activity-time">${event.time_ago}</div>
        </div>
    `;
    
    return item;
}

function getTimeAgo(timestamp) {
    const now = Math.floor(Date.now() / 1000);
    const diff = now - timestamp;
    
    if (diff < 60) return 'Just now';
    if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
    if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
    return Math.floor(diff / 86400) + 'd ago';
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
    
    // Get POND/SGB rate from pool for price comparison
    let pondToSgbRate = 0;
    try {
        const pool = new ethers.Contract(CONTRACTS.pondPool, PONDPOOL_ABI, readProvider);
        const [reserveSGB, reservePOND] = await Promise.all([
            pool.reserveSGB(),
            pool.reservePOND()
        ]);
        if (reservePOND.gt(0)) {
            pondToSgbRate = parseFloat(ethers.utils.formatEther(reserveSGB)) / parseFloat(ethers.utils.formatEther(reservePOND));
        }
        console.log('POND to SGB rate:', pondToSgbRate);
    } catch (err) {
        console.log('Could not get pool rate:', err.message);
    }
    
    // Load overall volume stats (convert POND to SGB equivalent)
    let totalVolumeFormatted = '0 SGB';
    try {
        const [volumeSGB, volumePOND, sales] = await marketplace.getStats();
        const sgbVol = parseFloat(ethers.utils.formatEther(volumeSGB));
        const pondVol = parseFloat(ethers.utils.formatEther(volumePOND));
        const totalVolume = sgbVol + (pondVol * pondToSgbRate);
        console.log('Total volume:', totalVolume, '(SGB:', sgbVol, 'POND:', pondVol, ')');
        totalVolumeFormatted = totalVolume > 0 ? formatNumber(totalVolume) + ' SGB' : '0 SGB';
        document.getElementById('totalVolume').textContent = totalVolumeFormatted;
    } catch (err) {
        console.error('Error loading volume:', err);
    }
    
    // Load floor for each collection in parallel using getActiveListings
    await Promise.all(COLLECTIONS.map(async (col) => {
        try {
            // Fetch collection stats (volume, sales)
            try {
                const [colVolSGB, colVolPOND, colSales] = await marketplace.getCollectionStats(col.address);
                const sgbVol = parseFloat(ethers.utils.formatEther(colVolSGB));
                const pondVol = parseFloat(ethers.utils.formatEther(colVolPOND));
                const collectionVolume = sgbVol + (pondVol * pondToSgbRate);
                const volumeText = formatNumber(collectionVolume) + ' SGB';
                
                const volumeEl = document.querySelector(`.volume-stat[data-collection="${col.address}"]`);
                if (volumeEl) volumeEl.textContent = volumeText;
            } catch (err) {
                console.log(`Could not fetch stats for ${col.name}:`, err.message);
            }
            
            // Use new getActiveListings function - instant, no event scanning!
            const activeTokenIds = await marketplace.getActiveListings(col.address);
            console.log(`${col.name}: ${activeTokenIds.length} active listings`);
            
            if (activeTokenIds.length === 0) return;
            
            // Check prices in parallel
            const results = await Promise.all(activeTokenIds.map(async (tokenId) => {
                try {
                    const [seller, priceSGB, pricePOND, active] = await marketplace.getListing(col.address, tokenId);
                    if (!active) return null;
                    
                    const sgbPrice = priceSGB.gt(0) ? parseFloat(ethers.utils.formatEther(priceSGB)) : null;
                    const pondPrice = pricePOND.gt(0) ? parseFloat(ethers.utils.formatEther(pricePOND)) : null;
                    
                    // Calculate SGB equivalent for comparison
                    let sgbEquivalent = Infinity;
                    let displayPrice = '';
                    
                    if (sgbPrice !== null && pondPrice !== null) {
                        // Both prices set - use lowest
                        const pondInSgb = pondPrice * pondToSgbRate;
                        if (sgbPrice <= pondInSgb) {
                            sgbEquivalent = sgbPrice;
                            displayPrice = sgbPrice.toFixed(1) + ' SGB';
                        } else {
                            sgbEquivalent = pondInSgb;
                            displayPrice = formatNumber(pondPrice) + ' POND';
                        }
                    } else if (sgbPrice !== null) {
                        sgbEquivalent = sgbPrice;
                        displayPrice = sgbPrice.toFixed(1) + ' SGB';
                    } else if (pondPrice !== null) {
                        sgbEquivalent = pondToSgbRate > 0 ? pondPrice * pondToSgbRate : pondPrice / 1000;
                        displayPrice = formatNumber(pondPrice) + ' POND';
                    }
                    
                    return { sgbEquivalent, displayPrice };
                } catch {}
                return null;
            }));
            
            const validPrices = results.filter(p => p !== null && p.sgbEquivalent < Infinity);
            
            if (validPrices.length > 0) {
                // Find lowest price
                const floor = validPrices.reduce((min, p) => 
                    p.sgbEquivalent < min.sgbEquivalent ? p : min
                );
                
                const floorEl = document.querySelector(`.floor-price[data-collection="${col.address}"]`);
                if (floorEl) floorEl.textContent = floor.displayPrice;
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
    
    // Build sets of staked and listed token IDs for deduplication
    const stakedKeys = new Set(stakedNfts.map(n => `${n.collection.address.toLowerCase()}-${n.tokenId}`));
    const listedKeys = new Set(listedNfts.map(n => `${n.collection.address.toLowerCase()}-${n.tokenId}`));
    
    // Filter wallet NFTs to remove any that are staked or listed (indexer may be stale)
    const filteredWalletNfts = walletNfts.filter(n => {
        const key = `${n.collection.address.toLowerCase()}-${n.tokenId}`;
        return !stakedKeys.has(key) && !listedKeys.has(key);
    });
    
    // Combine all
    const allNfts = [
        ...filteredWalletNfts.map(n => ({ ...n, isStaked: false, isListed: false })),
        ...stakedNfts.map(n => ({ ...n, isStaked: true, isListed: false })),
        ...listedNfts.map(n => ({ ...n, isStaked: false, isListed: true }))
    ];
    
    // Render
    if (allNfts.length === 0) {
        grid.innerHTML = '<div class="empty-state"><p>No NFTs found</p></div>';
    } else if (allNfts.length >= 50) {
        // Group by collection
        grid.innerHTML = '';
        const grouped = {};
        allNfts.forEach(nft => {
            const addr = nft.collection.address;
            if (!grouped[addr]) grouped[addr] = { collection: nft.collection, nfts: [] };
            grouped[addr].nfts.push(nft);
        });
        
        // Sort collections by NFT count descending
        const sortedGroups = Object.values(grouped).sort((a, b) => b.nfts.length - a.nfts.length);
        
        for (const group of sortedGroups) {
            const section = document.createElement('div');
            section.className = 'nft-collection-section';
            
            // Preview thumbnails (first 5)
            const previewCount = Math.min(5, group.nfts.length);
            const previewHtml = group.nfts.slice(0, previewCount).map(nft => {
                const baseUrl = nft.collection.thumbnailUri || nft.collection.baseUri || '';
                const ext = nft.collection.imageExt || '.png';
                const imgUrl = baseUrl ? baseUrl + nft.tokenId + ext : nft.collection.image;
                return `<div class="preview-thumb"><img src="${imgUrl}" onerror="this.parentElement.style.background='#252540'"></div>`;
            }).join('');
            const remainingCount = group.nfts.length - previewCount;
            const remainingHtml = remainingCount > 0 ? `<div class="preview-more">+${remainingCount}</div>` : '';
            
            const header = document.createElement('div');
            header.className = 'nft-collection-header';
            header.innerHTML = `
                <div class="collection-header-top">
                    <div class="collection-header-left">
                        <img src="${group.collection.image}" alt="${group.collection.name}" onerror="this.style.display='none'">
                        <div class="collection-header-text">
                            <span class="collection-name">${group.collection.name}</span>
                            <span class="collection-count-text">${group.nfts.length} NFTs</span>
                        </div>
                    </div>
                    <span class="collapse-icon">+</span>
                </div>
                <div class="collection-preview">${previewHtml}${remainingHtml}</div>
            `;
            header.onclick = () => {
                const content = section.querySelector('.nft-collection-content');
                const icon = header.querySelector('.collapse-icon');
                const preview = header.querySelector('.collection-preview');
                if (content.style.display === 'none') {
                    content.style.display = 'grid';
                    icon.textContent = '−';
                    preview.style.display = 'none';
                } else {
                    content.style.display = 'none';
                    icon.textContent = '+';
                    preview.style.display = 'flex';
                }
            };
            section.appendChild(header);
            
            const content = document.createElement('div');
            content.className = 'nft-collection-content';
            content.style.display = 'none'; // Collapsed by default
            for (const nft of group.nfts) {
                content.appendChild(createNftCard(nft.collection, nft.tokenId, nft.isStaked, null, nft.isListed));
            }
            section.appendChild(content);
            
            grid.appendChild(section);
        }
    } else {
        grid.innerHTML = '';
        for (const nft of allNfts) {
            grid.appendChild(createNftCard(nft.collection, nft.tokenId, nft.isStaked, null, nft.isListed));
        }
    }
}

async function loadWalletNfts() {
    // Try indexer first (fast!)
    try {
        const response = await fetch(`${INDEXER_URL}/user/${userAddress}/nfts`);
        if (response.ok) {
            const data = await response.json();
            if (data.total > 0) {
                console.log(`Loaded ${data.total} NFTs from indexer`);
                const nfts = [];
                for (const group of data.collections) {
                    const col = COLLECTIONS.find(c => c.address.toLowerCase() === group.collection.toLowerCase());
                    if (col) {
                        for (const tokenId of group.tokenIds) {
                            userNfts[col.address].push(tokenId);
                            nfts.push({ collection: col, tokenId });
                        }
                    }
                }
                return nfts;
            }
        }
    } catch (err) {
        console.log('Indexer unavailable, falling back to RPC:', err.message);
    }
    
    // Fallback to RPC
    const results = [];
    
    // Use wallet provider if available, fallback to RPC
    const readProvider = provider || new ethers.providers.JsonRpcProvider(SONGBIRD_RPC);
    
    // Query all collections in parallel
    const collectionPromises = COLLECTIONS.map(async (col) => {
        const contract = new ethers.Contract(col.address, ERC721_ABI, readProvider);
        const nfts = [];
        
        try {
            const balance = await contract.balanceOf(userAddress);
            console.log(`${col.name}: balance = ${balance.toString()}`);
            if (balance.eq(0)) return nfts;
            
            // Try enumerable first
            try {
                const testToken = await contract.tokenOfOwnerByIndex(userAddress, 0);
                const firstId = testToken.toNumber();
                userNfts[col.address].push(firstId);
                nfts.push({ collection: col, tokenId: firstId });
                
                if (balance.gt(1)) {
                    const indices = Array.from({ length: balance.toNumber() - 1 }, (_, i) => i + 1);
                    const tokens = await Promise.all(
                        indices.map(i => contract.tokenOfOwnerByIndex(userAddress, i))
                    );
                    for (const tokenId of tokens) {
                        const id = tokenId.toNumber();
                        userNfts[col.address].push(id);
                        nfts.push({ collection: col, tokenId: id });
                    }
                }
                console.log(`${col.name}: ✓ found ${nfts.length} via enumerable`);
            } catch (enumErr) {
                // Not enumerable - show message that indexer is needed
                console.log(`${col.name}: not enumerable, waiting for indexer...`);
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
    const results = [];
    
    try {
        // Check all collections for user's listings
        for (const col of COLLECTIONS) {
            const activeTokenIds = await marketplace.getActiveListings(col.address);
            
            // Check each listing to see if it belongs to user
            const checks = await Promise.all(activeTokenIds.map(async (tokenId) => {
                try {
                    const [seller, , , active] = await marketplace.getListing(col.address, tokenId);
                    if (active && seller.toLowerCase() === userAddress.toLowerCase()) {
                        return { 
                            collection: col, 
                            tokenId: tokenId.toNumber ? tokenId.toNumber() : Number(tokenId)
                        };
                    }
                } catch {}
                return null;
            }));
            
            results.push(...checks.filter(Boolean));
        }
        
        return results;
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
            imageUrl = collection.thumbnailUri + tokenId + (collection.imageExt || '.png');
        } else {
            // Get from metadata
            const metadata = collectionMetadata[collection.address];
            if (metadata && metadata[tokenId]) {
                imageUrl = ipfsToHttp(metadata[tokenId].art || metadata[tokenId].image);
            }
            if (!imageUrl) {
                // Fallback to baseUri
                imageUrl = collection.baseUri + tokenId + (collection.imageExt || '.png');
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
let activeTraitFilters = {}; // { trait_type: value }

// Extract unique traits from collection metadata
function getCollectionTraits(collectionAddress) {
    const metadata = collectionMetadata[collectionAddress];
    if (!metadata) return {};
    
    const traits = {}; // { trait_type: Set of values }
    
    for (const tokenId of Object.keys(metadata)) {
        const nft = metadata[tokenId];
        if (!nft.attributes) continue;
        
        for (const attr of nft.attributes) {
            if (!attr.trait_type || !attr.value) continue;
            if (!traits[attr.trait_type]) {
                traits[attr.trait_type] = new Set();
            }
            traits[attr.trait_type].add(attr.value);
        }
    }
    
    // Convert sets to sorted arrays
    const result = {};
    for (const [traitType, values] of Object.entries(traits)) {
        result[traitType] = Array.from(values).sort();
    }
    return result;
}

// Build trait filter dropdowns HTML
function buildTraitFiltersHtml(collectionAddress) {
    const traits = getCollectionTraits(collectionAddress);
    if (Object.keys(traits).length === 0) return '';
    
    let html = '<div class="trait-filters" id="traitFilters">';
    html += '<button class="trait-filter-toggle" onclick="toggleTraitFilters()">Filters ▼</button>';
    html += '<div class="trait-filter-dropdowns" id="traitFilterDropdowns" style="display:none;">';
    
    for (const [traitType, values] of Object.entries(traits)) {
        html += `
            <select class="trait-filter-select" data-trait="${traitType}" onchange="applyTraitFilter('${traitType}', this.value)">
                <option value="">${traitType}</option>
                ${values.map(v => `<option value="${v}">${v} (${countTraitValue(collectionAddress, traitType, v)})</option>`).join('')}
            </select>
        `;
    }
    
    html += '<button class="clear-filters-btn" onclick="clearTraitFilters()">Clear All</button>';
    html += '</div></div>';
    return html;
}

// Count how many NFTs have a specific trait value
function countTraitValue(collectionAddress, traitType, value) {
    const metadata = collectionMetadata[collectionAddress];
    if (!metadata) return 0;
    
    let count = 0;
    for (const tokenId of Object.keys(metadata)) {
        const nft = metadata[tokenId];
        if (!nft.attributes) continue;
        
        for (const attr of nft.attributes) {
            if (attr.trait_type === traitType && attr.value === value) {
                count++;
                break;
            }
        }
    }
    return count;
}

function toggleTraitFilters() {
    const dropdowns = document.getElementById('traitFilterDropdowns');
    const toggle = document.querySelector('.trait-filter-toggle');
    if (dropdowns.style.display === 'none') {
        dropdowns.style.display = 'flex';
        toggle.textContent = 'Filters ▲';
    } else {
        dropdowns.style.display = 'none';
        toggle.textContent = 'Filters ▼';
    }
}

function applyTraitFilter(traitType, value) {
    if (value) {
        activeTraitFilters[traitType] = value;
    } else {
        delete activeTraitFilters[traitType];
    }
    
    // Reset and reload
    collectionLoadOffset = 0;
    document.getElementById('collectionNftsGrid').innerHTML = '<div class="empty-state"><p>Loading...</p></div>';
    loadCollectionNfts(currentCollectionView);
}

function clearTraitFilters() {
    activeTraitFilters = {};
    
    // Reset all dropdowns
    document.querySelectorAll('.trait-filter-select').forEach(select => {
        select.value = '';
    });
    
    // Reload
    collectionLoadOffset = 0;
    document.getElementById('collectionNftsGrid').innerHTML = '<div class="empty-state"><p>Loading...</p></div>';
    loadCollectionNfts(currentCollectionView);
}

// Check if NFT passes current trait filters
function passesTraitFilters(nft) {
    if (Object.keys(activeTraitFilters).length === 0) return true;
    if (!nft || !nft.attributes) return false;
    
    for (const [traitType, requiredValue] of Object.entries(activeTraitFilters)) {
        const hasMatch = nft.attributes.some(attr => 
            attr.trait_type === traitType && attr.value === requiredValue
        );
        if (!hasMatch) return false;
    }
    return true;
}

function openCollectionView(collection) {
    currentCollectionView = collection;
    collectionLoadOffset = 0;
    collectionViewMode = 'all';
    isLoadingMore = false;
    activeTraitFilters = {}; // Reset trait filters
    
    // Update URL hash
    history.pushState(null, '', `#collection/${collection.address.toLowerCase()}`);
    
    // Hide main page elements (for mobile clarity)
    document.querySelector('.featured-banner')?.classList.add('hide-in-detail');
    document.querySelector('.filters')?.classList.add('hide-in-detail');
    document.querySelector('.activity-feed')?.classList.add('hide-in-detail');
    
    const grid = document.getElementById('collectionsGrid');
    grid.style.display = 'block';
    
    const traitFiltersHtml = buildTraitFiltersHtml(collection.address);
    
    grid.innerHTML = `
        <div class="collection-detail-view">
            <div class="collection-detail-header">
                <button class="back-btn" onclick="closeCollectionView()">← Back</button>
                <div class="collection-detail-info">
                    <img src="${ipfsToHttp(collection.image)}" class="collection-detail-avatar" alt="${collection.name}"
                         onerror="this.style.display='none'">
                    <div class="collection-detail-text">
                        <h2>${collection.name}</h2>
                        <p>${collection.description}</p>
                        <div class="collection-detail-stats">
                            <span>${formatNumber(collection.supply)} items</span>
                            <span id="collectionFloor">Floor: --</span>
                            <span id="collectionVolume">Volume: --</span>
                            <span id="collectionListed">Listed: --</span>
                            ${collection.stakeable ? '<span class="multiplier-badge">🔥 LP Boost Eligible</span>' : ''}
                        </div>
                    </div>
                </div>
            </div>
            ${traitFiltersHtml}
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
                    <option value="rarity-asc">Rarity: Common First</option>
                    <option value="rarity-desc">Rarity: Rare First</option>
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
    loadCollectionStats(collection);
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

async function loadCollectionStats(collection) {
    const readProvider = provider || new ethers.providers.JsonRpcProvider(SONGBIRD_RPC);
    const marketplace = new ethers.Contract(CONTRACTS.marketplace, MARKETPLACE_ABI, readProvider);
    
    try {
        // Get active listings
        const activeTokenIds = await marketplace.getActiveListings(collection.address);
        const listedCount = activeTokenIds.length;
        
        // Update listed count
        const listedEl = document.getElementById('collectionListed');
        if (listedEl) listedEl.textContent = `Listed: ${listedCount}`;
        
        // Find floor price from listings
        let floorSGB = Infinity;
        for (const tokenId of activeTokenIds.slice(0, 50)) { // Check first 50
            try {
                const [seller, priceSGB, pricePOND, active] = await marketplace.getListing(collection.address, tokenId);
                if (active && priceSGB.gt(0)) {
                    const price = parseFloat(ethers.utils.formatEther(priceSGB));
                    if (price < floorSGB) floorSGB = price;
                }
            } catch {}
        }
        
        const floorEl = document.getElementById('collectionFloor');
        if (floorEl) {
            floorEl.textContent = floorSGB === Infinity ? 'Floor: --' : `Floor: ${floorSGB.toFixed(2)} SGB`;
        }
        
    } catch (err) {
        console.log('Error loading collection stats:', err.message);
    }
    
    // Get volume from indexer
    try {
        const response = await fetch(`${INDEXER_URL}/collection/${collection.address}/stats`);
        if (response.ok) {
            const stats = await response.json();
            const volumeEl = document.getElementById('collectionVolume');
            if (volumeEl) {
                volumeEl.textContent = `Volume: ${formatNumber(stats.volumeSGB || 0)} SGB`;
            }
        }
    } catch {}
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
    
    // Show main page elements again
    document.querySelector('.featured-banner')?.classList.remove('hide-in-detail');
    document.querySelector('.filters')?.classList.remove('hide-in-detail');
    document.querySelector('.activity-feed')?.classList.remove('hide-in-detail');
    
    history.pushState(null, '', '#collections');
    loadCollections();
}

// ==================== USER PROFILES ====================
let currentProfileAddress = null;

async function openUserProfile(address) {
    currentProfileAddress = address.toLowerCase();
    currentCollectionView = null;
    
    history.pushState(null, '', `#user/${currentProfileAddress}`);
    
    const grid = document.getElementById('collectionsGrid');
    grid.style.display = 'block';
    
    const shortAddr = `${address.slice(0, 6)}...${address.slice(-4)}`;
    
    grid.innerHTML = `
        <div class="user-profile-view">
            <div class="profile-header">
                <button class="back-btn" onclick="closeUserProfile()">← Back</button>
                <div class="profile-info">
                    <div class="profile-avatar">${address.slice(2, 4).toUpperCase()}</div>
                    <div class="profile-text">
                        <h2>${shortAddr}</h2>
                        <a href="https://songbird-explorer.flare.network/address/${address}" target="_blank" class="profile-link">
                            View on Explorer ↗
                        </a>
                    </div>
                </div>
            </div>
            <div class="profile-stats" id="profileStats">
                <div class="profile-stat">
                    <span class="stat-value" id="statNftsOwned">-</span>
                    <span class="stat-label">NFTs Owned</span>
                </div>
                <div class="profile-stat">
                    <span class="stat-value" id="statListings">-</span>
                    <span class="stat-label">Active Listings</span>
                </div>
                <div class="profile-stat">
                    <span class="stat-value" id="statVolume">-</span>
                    <span class="stat-label">Volume Traded</span>
                </div>
            </div>
            <div class="profile-tabs">
                <button class="profile-tab-btn active" data-tab="owned" onclick="switchProfileTab('owned')">Owned</button>
                <button class="profile-tab-btn" data-tab="listings" onclick="switchProfileTab('listings')">Listings</button>
                <button class="profile-tab-btn" data-tab="activity" onclick="switchProfileTab('activity')">Activity</button>
            </div>
            <div class="profile-content" id="profileContent">
                <div class="empty-state"><p>Loading...</p></div>
            </div>
        </div>
    `;
    
    loadUserProfileData(address);
}

function closeUserProfile() {
    currentProfileAddress = null;
    history.pushState(null, '', '#collections');
    loadCollections();
}

async function loadUserProfileData(address) {
    const readProvider = provider || new ethers.providers.JsonRpcProvider(SONGBIRD_RPC);
    
    // Load owned NFTs across all collections
    let ownedNfts = [];
    let activeListings = [];
    
    for (const col of COLLECTIONS) {
        try {
            const nftContract = new ethers.Contract(col.address, ERC721_ABI, readProvider);
            const balance = await nftContract.balanceOf(address);
            
            if (balance.toNumber() > 0) {
                // Get token IDs - try tokenOfOwnerByIndex if available
                for (let i = 0; i < Math.min(balance.toNumber(), 50); i++) {
                    try {
                        const tokenId = await nftContract.tokenOfOwnerByIndex(address, i);
                        ownedNfts.push({
                            collection: col,
                            tokenId: tokenId.toNumber()
                        });
                    } catch {
                        break; // tokenOfOwnerByIndex not supported
                    }
                }
            }
        } catch (err) {
            console.log(`Error checking ${col.name}:`, err.message);
        }
    }
    
    // Get active listings for this user
    try {
        const marketplace = new ethers.Contract(CONTRACTS.marketplace, MARKETPLACE_ABI, readProvider);
        
        for (const col of COLLECTIONS) {
            try {
                const listedIds = await marketplace.getActiveListings(col.address);
                for (const tokenId of listedIds) {
                    const [seller, priceSGB, pricePOND, active] = await marketplace.getListing(col.address, tokenId);
                    if (active && seller.toLowerCase() === address.toLowerCase()) {
                        let priceText = '';
                        if (priceSGB.gt(0)) priceText = parseFloat(ethers.utils.formatEther(priceSGB)).toFixed(2) + ' SGB';
                        if (pricePOND.gt(0)) {
                            if (priceText) priceText += ' / ';
                            priceText += formatNumber(parseFloat(ethers.utils.formatEther(pricePOND))) + ' POND';
                        }
                        activeListings.push({
                            collection: col,
                            tokenId: tokenId.toNumber ? tokenId.toNumber() : Number(tokenId),
                            priceText
                        });
                    }
                }
            } catch {}
        }
    } catch (err) {
        console.log('Error loading listings:', err.message);
    }
    
    // Get volume from indexer
    let volumeTraded = 0;
    try {
        const response = await fetch(`${INDEXER_URL}/user/${address}/stats`);
        if (response.ok) {
            const stats = await response.json();
            volumeTraded = stats.volumeSGB || 0;
        }
    } catch {}
    
    // Update stats
    document.getElementById('statNftsOwned').textContent = ownedNfts.length;
    document.getElementById('statListings').textContent = activeListings.length;
    document.getElementById('statVolume').textContent = formatNumber(volumeTraded) + ' SGB';
    
    // Store for tab switching
    window.profileData = { ownedNfts, activeListings, address };
    
    // Load owned tab by default
    renderProfileOwned(ownedNfts);
}

function switchProfileTab(tab) {
    document.querySelectorAll('.profile-tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tab);
    });
    
    const content = document.getElementById('profileContent');
    
    if (tab === 'owned') {
        renderProfileOwned(window.profileData?.ownedNfts || []);
    } else if (tab === 'listings') {
        renderProfileListings(window.profileData?.activeListings || []);
    } else if (tab === 'activity') {
        renderProfileActivity(window.profileData?.address);
    }
}

function renderProfileOwned(nfts) {
    const content = document.getElementById('profileContent');
    
    if (nfts.length === 0) {
        content.innerHTML = '<div class="empty-state"><p>No NFTs owned</p></div>';
        return;
    }
    
    content.innerHTML = '<div class="profile-nfts-grid"></div>';
    const grid = content.querySelector('.profile-nfts-grid');
    
    for (const nft of nfts) {
        const metadata = collectionMetadata[nft.collection.address]?.[nft.tokenId];
        const imageUrl = metadata?.image ? ipfsToHttp(metadata.image) : nft.collection.image;
        
        const card = document.createElement('div');
        card.className = 'nft-card';
        card.innerHTML = `
            <div class="nft-image-container">
                <img src="${imageUrl}" alt="${nft.collection.name} #${nft.tokenId}" 
                     onerror="this.src='${nft.collection.image}'">
            </div>
            <div class="nft-info">
                <div class="nft-name">${nft.collection.name} #${nft.tokenId}</div>
            </div>
        `;
        card.onclick = () => openNftModal(nft.collection, nft.tokenId, false, null);
        grid.appendChild(card);
    }
}

function renderProfileListings(listings) {
    const content = document.getElementById('profileContent');
    
    if (listings.length === 0) {
        content.innerHTML = '<div class="empty-state"><p>No active listings</p></div>';
        return;
    }
    
    content.innerHTML = '<div class="profile-nfts-grid"></div>';
    const grid = content.querySelector('.profile-nfts-grid');
    
    for (const listing of listings) {
        const metadata = collectionMetadata[listing.collection.address]?.[listing.tokenId];
        const imageUrl = metadata?.image ? ipfsToHttp(metadata.image) : listing.collection.image;
        
        const card = document.createElement('div');
        card.className = 'nft-card';
        card.innerHTML = `
            <div class="nft-image-container">
                <img src="${imageUrl}" alt="${listing.collection.name} #${listing.tokenId}"
                     onerror="this.src='${listing.collection.image}'">
            </div>
            <div class="nft-info">
                <div class="nft-name">${listing.collection.name} #${listing.tokenId}</div>
                <div class="nft-price">${listing.priceText}</div>
            </div>
        `;
        card.onclick = () => openNftModal(listing.collection, listing.tokenId, false, null);
        grid.appendChild(card);
    }
}

async function renderProfileActivity(address) {
    const content = document.getElementById('profileContent');
    content.innerHTML = '<div class="empty-state"><p>Loading activity...</p></div>';
    
    try {
        const response = await fetch(`${INDEXER_URL}/user/${address}/activity`);
        if (!response.ok) throw new Error('Failed to fetch');
        
        const activities = await response.json();
        
        if (!activities || activities.length === 0) {
            content.innerHTML = '<div class="empty-state"><p>No activity found</p></div>';
            return;
        }
        
        content.innerHTML = '<div class="profile-activity-list"></div>';
        const list = content.querySelector('.profile-activity-list');
        
        for (const act of activities.slice(0, 50)) {
            const item = document.createElement('div');
            item.className = 'activity-item';
            
            const typeLabels = {
                'listed': '📋 Listed',
                'sold': '💰 Sold',
                'bought': '🛒 Bought',
                'unlisted': '❌ Unlisted',
                'staked': '🔒 Staked',
                'unstaked': '🔓 Unstaked',
                'offer_made': '💬 Offer Made',
                'offer_accepted': '✅ Offer Accepted'
            };
            
            const collection = COLLECTIONS.find(c => c.address.toLowerCase() === act.collection?.toLowerCase());
            const colName = collection?.name || 'Unknown';
            
            item.innerHTML = `
                <span class="activity-type">${typeLabels[act.event_type] || act.event_type}</span>
                <span class="activity-item-name">${colName} #${act.token_id || '?'}</span>
                <span class="activity-price">${act.price_sgb > 0 ? parseFloat(act.price_sgb).toFixed(2) + ' SGB' : ''}</span>
                <span class="activity-time">${formatTimeAgo(act.timestamp * 1000)}</span>
            `;
            list.appendChild(item);
        }
    } catch (err) {
        content.innerHTML = '<div class="empty-state"><p>Could not load activity</p></div>';
    }
}

// Helper to make addresses clickable
function makeAddressLink(address, short = true) {
    const display = short ? `${address.slice(0, 6)}...${address.slice(-4)}` : address;
    return `<a href="#user/${address.toLowerCase()}" class="address-link">${display}</a>`;
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
    
    // Fetch active listings first
    const readProvider = provider || new ethers.providers.JsonRpcProvider(SONGBIRD_RPC);
    const marketplace = new ethers.Contract(CONTRACTS.marketplace, MARKETPLACE_ABI, readProvider);
    
    let listingData = {};
    let listedTokenIds = [];
    try {
        const activeTokenIds = await marketplace.getActiveListings(collection.address);
        listedTokenIds = activeTokenIds.map(t => t.toNumber ? t.toNumber() : Number(t));
        
        // Get prices for listed items
        const listingResults = await Promise.all(activeTokenIds.map(async (tokenId) => {
            try {
                const [seller, priceSGB, pricePOND, active] = await marketplace.getListing(collection.address, tokenId);
                if (active) {
                    const id = tokenId.toNumber ? tokenId.toNumber() : Number(tokenId);
                    let sortPrice = 0;
                    if (priceSGB.gt(0)) sortPrice = parseFloat(ethers.utils.formatEther(priceSGB));
                    else if (pricePOND.gt(0)) sortPrice = parseFloat(ethers.utils.formatEther(pricePOND)) / 1000;
                    
                    let priceText = '';
                    if (priceSGB.gt(0)) priceText = parseFloat(ethers.utils.formatEther(priceSGB)).toFixed(2) + ' SGB';
                    if (pricePOND.gt(0)) {
                        if (priceText) priceText += ' / ';
                        priceText += formatNumber(parseFloat(ethers.utils.formatEther(pricePOND))) + ' POND';
                    }
                    
                    return { id, sortPrice, priceText };
                }
            } catch {}
            return null;
        }));
        
        listingResults.filter(Boolean).forEach(l => {
            listingData[l.id] = l;
        });
    } catch (err) {
        console.log('Could not fetch listings:', err.message);
    }
    
    // Sort order from dropdown
    const sortSelect = document.getElementById('listingSortSelect');
    const sortBy = sortSelect ? sortSelect.value : 'price-asc';
    
    // Build token ID list based on sort
    let tokenIds = [];
    const rarityData = collectionRarity[collection.address] || {};
    
    if (sortBy === 'price-asc' || sortBy === 'price-desc') {
        // Price sort: Listed items first (sorted by price), then unlisted by ID
        const sortedListings = Object.values(listingData).sort((a, b) => 
            sortBy === 'price-asc' ? a.sortPrice - b.sortPrice : b.sortPrice - a.sortPrice
        );
        const listedIds = sortedListings.map(l => l.id);
        
        const allTokenIds = Object.keys(metadata).map(id => parseInt(id)).sort((a, b) => a - b);
        const unlistedIds = allTokenIds.filter(id => !listedTokenIds.includes(id));
        
        tokenIds = [...listedIds, ...unlistedIds];
    } else if (sortBy === 'rarity-asc' || sortBy === 'rarity-desc') {
        // Rarity sort
        const allTokenIds = Object.keys(metadata).map(id => parseInt(id));
        tokenIds = allTokenIds.sort((a, b) => {
            const rankA = rarityData[a]?.rank || Infinity;
            const rankB = rarityData[b]?.rank || Infinity;
            return sortBy === 'rarity-desc' ? rankA - rankB : rankB - rankA;
        });
    } else {
        // ID sort
        const allTokenIds = Object.keys(metadata).map(id => parseInt(id));
        tokenIds = sortBy === 'id-desc' 
            ? allTokenIds.sort((a, b) => b - a)
            : allTokenIds.sort((a, b) => a - b);
    }
    
    // Apply trait filters
    if (Object.keys(activeTraitFilters).length > 0) {
        tokenIds = tokenIds.filter(tokenId => passesTraitFilters(metadata[tokenId]));
    }
    
    // Paginate
    const pageSize = 100;
    const pageTokenIds = tokenIds.slice(collectionLoadOffset, collectionLoadOffset + pageSize);
    
    if (pageTokenIds.length === 0) return;
    
    for (const tokenId of pageTokenIds) {
        const nftData = metadata[tokenId];
        const card = document.createElement('div');
        card.className = 'nft-card';
        card.dataset.tokenId = tokenId;
        
        const listing = listingData[tokenId];
        card.dataset.price = listing ? listing.sortPrice : 0;
        
        // Get rarity info
        const rarity = rarityData[tokenId];
        const totalSupply = Object.keys(metadata).length;
        const rarityTier = rarity ? getRarityTier(rarity.rank, totalSupply) : null;
        const rarityBadge = (rarityTier && !collection.noRarity) ? `<div class="rarity-badge" style="background: ${rarityTier.color}">#${rarity.rank}</div>` : '';
        
        let imageUrl = collection.thumbnailUri 
            ? collection.thumbnailUri + tokenId + (collection.imageExt || '.png')
            : ipfsToHttp(nftData?.art || nftData?.image || collection.baseUri + tokenId + (collection.imageExt || '.png'));
        
        const listedBadge = listing ? '<div class="listed-badge">LISTED</div>' : '';
        const priceDisplay = listing ? `<div class="nft-price">${listing.priceText}</div>` : '';
        
        card.innerHTML = `
            <div class="nft-image">
                <img src="${imageUrl}" alt="${collection.name} #${tokenId}" loading="lazy"
                     onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><rect fill=%22%231a1a2e%22 width=%22100%22 height=%22100%22/><text x=%2250%22 y=%2250%22 text-anchor=%22middle%22 fill=%22%23666%22 font-size=%2210%22>#${tokenId}</text></svg>'">
                ${listedBadge}
                ${rarityBadge}
            </div>
            <div class="nft-info">
                <div class="nft-name">${collection.name} #${tokenId}</div>
                ${priceDisplay || `<div class="nft-collection">${collection.symbol}</div>`}
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
    
    // Use new getActiveListings - instant!
    const tokenIds = await marketplace.getActiveListings(collection.address);
    
    if (tokenIds.length === 0) {
        grid.innerHTML = '<div class="empty-state"><p>No active listings</p></div>';
        return;
    }
    
    // Get listing details in parallel
    const listings = await Promise.all(tokenIds.map(async (tokenId) => {
        try {
            const [seller, priceSGB, pricePOND, active] = await marketplace.getListing(collection.address, tokenId);
            if (active) return { tokenId: tokenId.toNumber ? tokenId.toNumber() : Number(tokenId), seller, priceSGB, pricePOND };
        } catch {}
        return null;
    }));
    
    const activeListings = listings.filter(Boolean);
    grid.innerHTML = '';
    
    if (activeListings.length === 0) {
        grid.innerHTML = '<div class="empty-state"><p>No active listings</p></div>';
        return;
    }
    
    // Add sortPrice to each listing and sort
    activeListings.forEach(listing => {
        let sortPrice = 0;
        if (listing.priceSGB.gt(0)) sortPrice = parseFloat(ethers.utils.formatEther(listing.priceSGB));
        else if (listing.pricePOND.gt(0)) sortPrice = parseFloat(ethers.utils.formatEther(listing.pricePOND)) / 1000;
        listing.sortPrice = sortPrice;
    });
    
    const sortSelect = document.getElementById('listingSortSelect');
    const sortBy = sortSelect ? sortSelect.value : 'price-asc';
    
    activeListings.sort((a, b) => {
        switch (sortBy) {
            case 'price-asc': return a.sortPrice - b.sortPrice;
            case 'price-desc': return b.sortPrice - a.sortPrice;
            case 'id-asc': return a.tokenId - b.tokenId;
            case 'id-desc': return b.tokenId - a.tokenId;
            default: return a.sortPrice - b.sortPrice;
        }
    });
    
    for (const listing of activeListings) {
        const tokenId = listing.tokenId;
        const nftData = metadata[tokenId];
        
        // Get rarity info
        const rarityData = collectionRarity[collection.address] || {};
        const rarity = rarityData[tokenId];
        const totalSupply = Object.keys(metadata).length;
        const rarityTier = rarity ? getRarityTier(rarity.rank, totalSupply) : null;
        const rarityBadge = (rarityTier && !collection.noRarity) ? `<div class="rarity-badge" style="background: ${rarityTier.color}">#${rarity.rank}</div>` : '';
        
        let imageUrl = collection.thumbnailUri
            ? collection.thumbnailUri + tokenId + (collection.imageExt || '.png')
            : ipfsToHttp(nftData?.art || nftData?.image || collection.baseUri + tokenId + (collection.imageExt || '.png'));
        
        let priceText = '';
        if (listing.priceSGB.gt(0)) priceText = parseFloat(ethers.utils.formatEther(listing.priceSGB)).toFixed(2) + ' SGB';
        if (listing.pricePOND.gt(0)) {
            if (priceText) priceText += ' / ';
            priceText += formatNumber(parseFloat(ethers.utils.formatEther(listing.pricePOND))) + ' POND';
        }
        
        const card = document.createElement('div');
        card.className = 'nft-card';
        card.dataset.tokenId = tokenId;
        card.dataset.price = listing.sortPrice;
        card.dataset.rank = rarity?.rank || 9999999;
        
        card.innerHTML = `
            <div class="nft-image">
                <img src="${imageUrl}" alt="${collection.name} #${tokenId}" loading="lazy"
                     onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><rect fill=%22%231a1a2e%22 width=%22100%22 height=%22100%22/><text x=%2250%22 y=%2250%22 text-anchor=%22middle%22 fill=%22%23666%22 font-size=%2210%22>#${tokenId}</text></svg>'">
                <div class="listed-badge">LISTED</div>
                ${rarityBadge}
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
    if (!currentCollectionView) return;
    
    // Reload with new sort order
    collectionLoadOffset = 0;
    document.getElementById('collectionNftsGrid').innerHTML = '<div class="empty-state"><p>Loading...</p></div>';
    
    if (collectionViewMode === 'listings') {
        loadListedNfts(currentCollectionView, document.getElementById('collectionNftsGrid'));
    } else {
        loadCollectionNfts(currentCollectionView);
    }
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
            imageUrl = ipfsToHttp(metadata[tokenId].art || metadata[tokenId].image);
        }
        if (!imageUrl) {
            if (collection.baseUri.includes('ipfs://')) {
                imageUrl = ipfsToHttp(collection.baseUri) + tokenId + (collection.imageExt || '.png');
            } else if (collection.baseUri.endsWith('/')) {
                imageUrl = collection.baseUri + tokenId + (collection.imageExt || '.png');
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
    let traitsHtml = '';
    
    // Add rarity info
    const rarityData = collectionRarity[collection.address];
    if (rarityData && rarityData[tokenId] && !collection.noRarity) {
        const rarity = rarityData[tokenId];
        const totalSupply = Object.keys(metadata || {}).length;
        const rarityTier = getRarityTier(rarity.rank, totalSupply);
        traitsHtml += `
            <div class="trait-item rarity-trait">
                <span class="trait-label">Rarity Rank</span>
                <span class="trait-value" style="color: ${rarityTier.color}">#${rarity.rank} / ${totalSupply}</span>
            </div>
            <div class="trait-item rarity-trait">
                <span class="trait-label">Tier</span>
                <span class="trait-value" style="color: ${rarityTier.color}">${rarityTier.tier}</span>
            </div>
        `;
    }
    
    // Add attributes
    if (metadata && metadata[tokenId] && metadata[tokenId].attributes) {
        for (const attr of metadata[tokenId].attributes) {
            traitsHtml += `
                <div class="trait-item">
                    <span class="trait-label">${attr.trait_type}</span>
                    <span class="trait-value">${attr.value}</span>
                </div>
            `;
        }
    }
    
    traitsEl.innerHTML = traitsHtml || '<div class="empty-traits">No traits available</div>';
    
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
            buyButtons += `<button class="modal-btn secondary" onclick="showOfferForm('${collection.address}', ${tokenId})">Make Offer</button>`;
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
            const stakeBtn = collection.stakeable 
                ? `<button class="modal-btn primary" onclick="stakeNft('${collection.address}', ${tokenId})">Stake for LP Boost</button>`
                : '';
            actionsEl.innerHTML = `
                ${stakeBtn}
                <button class="modal-btn ${collection.stakeable ? 'secondary' : 'primary'}" onclick="listNft('${collection.address}', ${tokenId})">List for Sale</button>
            `;
        } else if (isConnected) {
            actionsEl.innerHTML = `<button class="modal-btn secondary" onclick="showOfferForm('${collection.address}', ${tokenId})">Make Offer</button>`;
        } else {
            actionsEl.innerHTML = `<p style="color: var(--text-muted);">Connect wallet to make offer</p>`;
        }
    }
    
    // Load offers for this NFT
    const historyEl = document.getElementById('historyList');
    historyEl.innerHTML = '<div style="color: var(--text-muted); font-size: 13px;">Loading offers...</div>';
    
    // Check if user is owner or seller
    let canAcceptOffers = false;
    if (isConnected) {
        try {
            const nftContract = new ethers.Contract(collection.address, ERC721_ABI, provider);
            const owner = await nftContract.ownerOf(tokenId);
            canAcceptOffers = owner.toLowerCase() === userAddress.toLowerCase() || 
                              (listing && listing.seller.toLowerCase() === userAddress.toLowerCase());
        } catch {}
    }
    
    try {
        const marketplace = new ethers.Contract(CONTRACTS.marketplace, MARKETPLACE_ABI, provider);
        const offers = await marketplace.getOffers(collection.address, tokenId);
        
        const validOffers = offers.filter(o => o.buyer !== '0x0000000000000000000000000000000000000000');
        
        if (validOffers.length === 0) {
            historyEl.innerHTML = '<div style="color: var(--text-muted); font-size: 13px;">No offers yet</div>';
        } else {
            let offersHtml = '<div style="font-size: 13px; font-weight: 600; margin-bottom: 8px;">Offers</div>';
            
            for (let i = 0; i < offers.length; i++) {
                const offer = offers[i];
                if (offer.buyer === '0x0000000000000000000000000000000000000000') continue; // Cancelled
                
                const expiry = new Date(offer.expiry.toNumber() * 1000);
                const expired = expiry < new Date();
                
                let amountText = '';
                if (offer.amountSGB.gt(0)) amountText += parseFloat(ethers.utils.formatEther(offer.amountSGB)).toFixed(2) + ' SGB';
                if (offer.amountPOND.gt(0)) {
                    if (amountText) amountText += ' + ';
                    amountText += formatNumber(parseFloat(ethers.utils.formatEther(offer.amountPOND))) + ' POND';
                }
                
                offersHtml += `
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid var(--border); gap: 12px;">
                        <div style="flex: 1; min-width: 0;">
                            <div style="color: white; font-weight: 500;">${amountText}</div>
                            <div style="color: var(--text-muted); font-size: 11px;">
                                ${formatAddress(offer.buyer)} • ${expired ? 'Expired' : 'Expires ' + expiry.toLocaleDateString()}
                            </div>
                        </div>
                        <div style="flex-shrink: 0;">
                        ${!expired && canAcceptOffers ? 
                            `<button class="modal-btn primary" style="padding: 6px 16px; font-size: 12px;" onclick="acceptOffer('${collection.address}', ${tokenId}, ${i})">Accept</button>` : 
                            ''}
                        ${!expired && isConnected && offer.buyer.toLowerCase() === userAddress.toLowerCase() ? 
                            `<button class="modal-btn secondary" style="padding: 6px 16px; font-size: 12px;" onclick="cancelOffer('${collection.address}', ${tokenId}, ${i})">Cancel</button>` : 
                            ''}
                        </div>
                    </div>
                `;
            }
            historyEl.innerHTML = offersHtml;
        }
    } catch (err) {
        console.log('Could not load offers:', err.message);
        historyEl.innerHTML = '<div style="color: var(--text-muted); font-size: 13px;">No offers yet</div>';
    }
    
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
        
        // Force full page reload to get fresh data
        window.location.reload();
        
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
        
        // Force full page reload to get fresh data
        window.location.reload();
        
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
        const stakingContract = new ethers.Contract(CONTRACTS.nftStaking, NFT_STAKING_ABI, signer);
        
        // Only stake collections that are stakeable (sToadz, Lofts, SBCity)
        const stakeableCollections = COLLECTIONS.filter(col => col.stakeable);
        
        let totalStaked = 0;
        const BATCH_SIZE = 50; // Contract max is 50
        
        for (const col of stakeableCollections) {
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
            
            // Stake in batches of 50
            for (let i = 0; i < tokens.length; i += BATCH_SIZE) {
                const batch = tokens.slice(i, i + BATCH_SIZE);
                const batchNum = Math.floor(i / BATCH_SIZE) + 1;
                const totalBatches = Math.ceil(tokens.length / BATCH_SIZE);
                
                showToast(`Staking ${col.name} batch ${batchNum}/${totalBatches} (${batch.length} NFTs)...`);
                const tx = await stakingContract.stakeBatch(col.address, batch);
                await tx.wait();
                totalStaked += batch.length;
            }
        }
        
        if (totalStaked === 0) {
            showToast('No stakeable NFTs found', 'error');
            return;
        }
        
        showToast(`${totalStaked} NFTs staked!`);
        
        // Force full page reload to get fresh data
        window.location.reload();
        
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
        const btn = document.getElementById('unstakeAllBtn');
        const originalText = btn.textContent;
        btn.textContent = 'Unstaking...';
        btn.disabled = true;
        
        const stakingContract = new ethers.Contract(CONTRACTS.nftStaking, NFT_STAKING_ABI, signer);
        const stakeableCollections = COLLECTIONS.filter(col => col.stakeable);
        const BATCH_SIZE = 50;
        
        let totalUnstaked = 0;
        
        for (const col of stakeableCollections) {
            // Get staked tokens for this collection
            const stakedTokens = await stakingContract.getStakedTokens(userAddress, col.address);
            if (stakedTokens.length === 0) continue;
            
            const tokens = stakedTokens.map(t => t.toNumber());
            
            // Unstake in batches of 50
            for (let i = 0; i < tokens.length; i += BATCH_SIZE) {
                const batch = tokens.slice(i, i + BATCH_SIZE);
                const batchNum = Math.floor(i / BATCH_SIZE) + 1;
                const totalBatches = Math.ceil(tokens.length / BATCH_SIZE);
                
                showToast(`Unstaking ${col.name} batch ${batchNum}/${totalBatches} (${batch.length} NFTs)...`);
                const tx = await stakingContract.unstakeBatch(col.address, batch);
                await tx.wait();
                totalUnstaked += batch.length;
            }
        }
        
        if (totalUnstaked === 0) {
            showToast('No staked NFTs found', 'error');
        } else {
            showToast(`${totalUnstaked} NFTs unstaked!`);
            // Force full page reload to get fresh data
            window.location.reload();
        }
        
        btn.textContent = originalText;
        btn.disabled = false;
        
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
        const tx = await marketplace.list(
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
        const tx = await marketplace.unlist(collectionAddress, tokenId);
        await tx.wait();
        
        showToast('Listing cancelled!');
        closeModal();
        
        // Force full page reload to get fresh data
        window.location.reload();
        
    } catch (err) {
        console.error('Cancel failed:', err);
        showToast('Cancel failed: ' + (err.reason || err.message), 'error');
    }
}

function showOfferForm(collectionAddress, tokenId) {
    const actionsEl = document.getElementById('modalActions');
    actionsEl.innerHTML = `
        <div class="offer-form" style="display: flex; flex-direction: column; gap: 10px; width: 100%;">
            <div style="display: flex; gap: 10px;">
                <input type="number" id="offerSGB" placeholder="SGB amount" style="flex: 1; padding: 10px; border-radius: 8px; border: 1px solid var(--border); background: var(--bg-dark); color: white; min-width: 0;">
                <input type="number" id="offerPOND" placeholder="POND amount" style="flex: 1; padding: 10px; border-radius: 8px; border: 1px solid var(--border); background: var(--bg-dark); color: white; min-width: 0;">
            </div>
            <select id="offerDuration" style="padding: 10px; border-radius: 8px; border: 1px solid var(--border); background: var(--bg-dark); color: white; width: 100%;">
                <option value="86400">1 day</option>
                <option value="259200">3 days</option>
                <option value="604800" selected>7 days</option>
                <option value="2592000">30 days</option>
            </select>
            <div style="display: flex; gap: 10px;">
                <button class="modal-btn primary" style="flex: 1;" onclick="submitOffer('${collectionAddress}', ${tokenId})">Submit Offer</button>
                <button class="modal-btn secondary" style="flex: 1;" onclick="closeModal()">Cancel</button>
            </div>
        </div>
    `;
}

async function submitOffer(collectionAddress, tokenId) {
    if (!isConnected) return;
    
    const sgbAmount = document.getElementById('offerSGB').value || '0';
    const pondAmount = document.getElementById('offerPOND').value || '0';
    const duration = document.getElementById('offerDuration').value;
    
    if (parseFloat(sgbAmount) <= 0 && parseFloat(pondAmount) <= 0) {
        showToast('Enter an offer amount', 'error');
        return;
    }
    
    const actionsEl = document.getElementById('modalActions');
    const originalHtml = actionsEl.innerHTML;
    
    try {
        const marketplace = new ethers.Contract(CONTRACTS.marketplace, MARKETPLACE_ABI, signer);
        const pondWei = ethers.utils.parseEther(pondAmount || '0');
        const sgbWei = ethers.utils.parseEther(sgbAmount || '0');
        
        // Approve POND if needed
        if (pondWei.gt(0)) {
            actionsEl.innerHTML = `<button class="modal-btn" disabled>Approving POND...</button>`;
            const pondContract = new ethers.Contract(CONTRACTS.pondToken, ERC20_ABI, signer);
            const allowance = await pondContract.allowance(userAddress, CONTRACTS.marketplace);
            
            if (allowance.lt(pondWei)) {
                const approveTx = await pondContract.approve(CONTRACTS.marketplace, pondWei);
                await approveTx.wait();
            }
        }
        
        actionsEl.innerHTML = `<button class="modal-btn" disabled>Submitting Offer...</button>`;
        
        const tx = await marketplace.makeOffer(collectionAddress, tokenId, pondWei, duration, { value: sgbWei });
        await tx.wait();
        
        showToast('Offer submitted!');
        closeModal();
        
    } catch (err) {
        console.error('Offer failed:', err);
        showToast('Offer failed: ' + (err.reason || err.message), 'error');
        actionsEl.innerHTML = originalHtml;
    }
}

async function acceptOffer(collectionAddress, tokenId, offerIndex) {
    if (!isConnected) return;
    
    try {
        showToast('Accepting offer...');
        const marketplace = new ethers.Contract(CONTRACTS.marketplace, MARKETPLACE_ABI, signer);
        const tx = await marketplace.acceptOffer(collectionAddress, tokenId, offerIndex);
        await tx.wait();
        
        showToast('Offer accepted! NFT sold.');
        closeModal();
        await loadUserNfts();
        
    } catch (err) {
        console.error('Accept offer failed:', err);
        showToast('Accept failed: ' + (err.reason || err.message), 'error');
    }
}

async function cancelOffer(collectionAddress, tokenId, offerIndex) {
    if (!isConnected) return;
    
    try {
        showToast('Cancelling offer...');
        const marketplace = new ethers.Contract(CONTRACTS.marketplace, MARKETPLACE_ABI, signer);
        const tx = await marketplace.cancelOffer(collectionAddress, tokenId, offerIndex);
        await tx.wait();
        
        showToast('Offer cancelled, funds refunded.');
        closeModal();
        
    } catch (err) {
        console.error('Cancel offer failed:', err);
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
    // ==================== LEADERBOARD ====================

// Leaderboard tab switching
document.querySelectorAll('.lb-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.lb-tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.lb-content').forEach(c => c.classList.remove('active'));
        
        btn.classList.add('active');
        const target = btn.dataset.lb;
        document.getElementById(`lb-${target}`).classList.add('active');
        
        // Load data for this tab if not already loaded
        loadLeaderboardData(target);
    });
});

async function loadLeaderboardData(type) {
    const bodyId = `${type}LbBody`;
    const body = document.getElementById(bodyId);
    
    if (!body || body.dataset.loaded === 'true') return;
    
    body.innerHTML = '<div class="lb-loading">Loading...</div>';
    
    try {
        if (type === 'stakers') {
            await loadStakersLeaderboard(body);
        } else if (type === 'traders') {
            await loadTradersLeaderboard(body);
        } else if (type === 'lp') {
            await loadLpLeaderboard(body);
        }
        body.dataset.loaded = 'true';
    } catch (err) {
        console.error(`Failed to load ${type} leaderboard:`, err);
        body.innerHTML = '<div class="lb-loading">Failed to load data</div>';
    }
}

async function loadStakersLeaderboard(body) {
    // Try to get from indexer first
    let stakers = [];
    
    try {
        const response = await fetch(`${INDEXER_URL}/leaderboard/stakers`);
        if (response.ok) {
            stakers = await response.json();
        }
    } catch (err) {
        console.log('Indexer not available, using on-chain data');
    }
    
    // If no indexer data, get from contract events
    if (stakers.length === 0) {
        try {
            const readProvider = new ethers.providers.JsonRpcProvider(SONGBIRD_RPC);
            const stakingContract = new ethers.Contract(CONTRACTS.nftStaking, NFT_STAKING_ABI, readProvider);
            
            // Get Staked events
            const filter = stakingContract.filters.Staked();
            const events = await stakingContract.queryFilter(filter, -50000);
            
            // Count stakes per user
            const stakerMap = {};
            for (const event of events) {
                const user = event.args.user;
                if (!stakerMap[user]) stakerMap[user] = { address: user, count: 0 };
                stakerMap[user].count++;
            }
            
            stakers = Object.values(stakerMap).sort((a, b) => b.count - a.count).slice(0, 25);
        } catch (err) {
            console.error('Failed to get staking data:', err);
        }
    }
    
    if (stakers.length === 0) {
        body.innerHTML = '<div class="lb-loading">No staking data available</div>';
        return;
    }
    
    // Fetch pending rewards for each staker
    try {
        const readProvider = new ethers.providers.JsonRpcProvider(SONGBIRD_RPC);
        const stakingContract = new ethers.Contract(CONTRACTS.nftStaking, NFT_STAKING_ABI, readProvider);
        
        // Batch fetch pending rewards
        const rewardPromises = stakers.map(s => 
            stakingContract.pendingRewards(s.address).catch(() => ethers.BigNumber.from(0))
        );
        const rewards = await Promise.all(rewardPromises);
        
        // Attach pending + claimed to get total earned
        stakers.forEach((s, i) => {
            const pending = parseFloat(ethers.utils.formatEther(rewards[i]));
            const claimed = s.pondClaimed || 0;
            s.totalPond = pending + claimed;
        });
    } catch (err) {
        console.error('Failed to fetch pending rewards:', err);
        // Still show claimed even if pending fails
        stakers.forEach(s => {
            s.totalPond = s.pondClaimed || 0;
        });
    }
    
    body.innerHTML = stakers.map((s, i) => `
        <div class="lb-row">
            <span class="lb-rank">${i + 1}</span>
            <span class="lb-address">
                <a href="#user/${s.address.toLowerCase()}">
                    ${s.address.slice(0, 6)}...${s.address.slice(-4)}
                </a>
            </span>
            <span class="lb-value">${s.count || s.nftsStaked || 0}</span>
            <span class="lb-value">${formatNumber(s.totalPond || 0)} POND</span>
        </div>
    `).join('');
}

async function loadTradersLeaderboard(body) {
    let traders = [];
    
    try {
        const response = await fetch(`${INDEXER_URL}/leaderboard/traders`);
        if (response.ok) {
            traders = await response.json();
        }
    } catch (err) {
        console.log('Indexer not available');
    }
    
    // Fallback to contract events
    if (traders.length === 0) {
        try {
            const readProvider = new ethers.providers.JsonRpcProvider(SONGBIRD_RPC);
            const marketplace = new ethers.Contract(CONTRACTS.marketplace, MARKETPLACE_ABI, readProvider);
            
            const filter = marketplace.filters.Sold();
            const events = await marketplace.queryFilter(filter, -50000);
            
            const traderMap = {};
            for (const event of events) {
                const buyer = event.args.buyer;
                const priceSGB = parseFloat(ethers.utils.formatEther(event.args.priceSGB || 0));
                
                if (!traderMap[buyer]) traderMap[buyer] = { address: buyer, volume: 0, sales: 0 };
                traderMap[buyer].volume += priceSGB;
                traderMap[buyer].sales++;
            }
            
            traders = Object.values(traderMap).sort((a, b) => b.volume - a.volume).slice(0, 25);
        } catch (err) {
            console.error('Failed to get trading data:', err);
        }
    }
    
    if (traders.length === 0) {
        body.innerHTML = '<div class="lb-loading">No trading data available</div>';
        return;
    }
    
    body.innerHTML = traders.map((t, i) => `
        <div class="lb-row">
            <span class="lb-rank">${i + 1}</span>
            <span class="lb-address">
                <a href="#user/${t.address.toLowerCase()}">
                    ${t.address.slice(0, 6)}...${t.address.slice(-4)}
                </a>
            </span>
            <span class="lb-value">${formatNumber(t.volume || t.volumeSGB || 0)} SGB</span>
            <span class="lb-value">${t.sales || t.salesCount || 0}</span>
        </div>
    `).join('');
}

async function loadLpLeaderboard(body) {
    let lpProviders = [];
    
    try {
        const response = await fetch(`${INDEXER_URL}/leaderboard/lp`);
        if (response.ok) {
            lpProviders = await response.json();
        }
    } catch (err) {
        console.log('Indexer not available');
    }
    
    // For LP, we'd need to query the pool contract for each known depositor
    // This is complex without an indexer, so show message
    if (lpProviders.length === 0) {
        body.innerHTML = '<div class="lb-loading">LP leaderboard coming soon</div>';
        return;
    }
    
    const lockTierNames = ['None', '30 Days', '90 Days', '180 Days', '365 Days'];
    
    body.innerHTML = lpProviders.map((lp, i) => `
        <div class="lb-row">
            <span class="lb-rank">${i + 1}</span>
            <span class="lb-address">
                <a href="#user/${lp.address.toLowerCase()}">
                    ${lp.address.slice(0, 6)}...${lp.address.slice(-4)}
                </a>
            </span>
            <span class="lb-value">${formatNumber(lp.liquidity || 0)} SGB</span>
            <span class="lb-value">${lockTierNames[lp.lockTier] || 'Unknown'}</span>
        </div>
    `).join('');
}

// Load stakers leaderboard by default when tab opens
function initLeaderboard() {
    // Will be called when leaderboard tab is first opened
    loadLeaderboardData('stakers');
}

// ==================== NOTIFICATIONS ====================

// Toggle notification dropdown
document.getElementById('notifBtn').addEventListener('click', (e) => {
    e.stopPropagation();
    const dropdown = document.getElementById('notifDropdown');
    dropdown.classList.toggle('show');
    
    if (dropdown.classList.contains('show')) {
        loadNotifications();
    }
});

// Close dropdown when clicking outside
document.addEventListener('click', (e) => {
    const dropdown = document.getElementById('notifDropdown');
    const container = document.querySelector('.notif-container');
    if (!container.contains(e.target)) {
        dropdown.classList.remove('show');
    }
});

// Clear all notifications
document.getElementById('clearNotifsBtn').addEventListener('click', async () => {
    if (!userAddress) return;
    
    try {
        await fetch(`${INDEXER_URL}/user/${userAddress}/notifications/clear`, { method: 'POST' });
        document.getElementById('notifList').innerHTML = '<div class="notif-empty">No notifications</div>';
        document.getElementById('notifBadge').textContent = '0';
        document.getElementById('notifBadge').style.display = 'none';
    } catch (err) {
        console.error('Failed to clear notifications:', err);
    }
});

async function loadNotifications() {
    if (!userAddress) {
        document.getElementById('notifList').innerHTML = '<div class="notif-empty">Connect wallet to see notifications</div>';
        return;
    }
    
    const notifList = document.getElementById('notifList');
    notifList.innerHTML = '<div class="lb-loading">Loading...</div>';
    
    try {
        const response = await fetch(`${INDEXER_URL}/user/${userAddress}/notifications`);
        if (!response.ok) throw new Error('Failed to fetch');
        
        const notifications = await response.json();
        
        if (!notifications || notifications.length === 0) {
            notifList.innerHTML = '<div class="notif-empty">No notifications</div>';
            return;
        }
        
        notifList.innerHTML = notifications.map(n => `
            <div class="notif-item ${n.type}">
                <div class="notif-title">${n.title}</div>
                <div class="notif-desc">${n.description}</div>
                <div class="notif-time">${formatTimeAgo(n.timestamp)}</div>
            </div>
        `).join('');
        
    } catch (err) {
        console.error('Failed to load notifications:', err);
        notifList.innerHTML = '<div class="notif-empty">Could not load notifications</div>';
    }
}

function formatTimeAgo(timestamp) {
    const seconds = Math.floor((Date.now() - new Date(timestamp)) / 1000);
    
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
}

}
