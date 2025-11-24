<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Toadz Marketplace | Zero-Fee NFT Trading</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Press+Start+2P&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="styles.css">
</head>
<body>
    <!-- Header -->
    <header class="header">
        <div class="header-left">
            <a href="/" class="logo">TOADZ</a>
            <nav class="nav">
                <button class="nav-btn active" data-tab="collections">Collections</button>
                <button class="nav-btn" data-tab="my-nfts">My NFTs</button>
                <button class="nav-btn" data-tab="staking">Staking</button>
                <button class="nav-btn" data-tab="lp">LP</button>
                <button class="nav-btn" data-tab="governance">Governance</button>
            </nav>
        </div>
        <div class="header-right">
            <div class="balances" id="balances">
                <div class="balance-item">
                    <span class="balance-value" id="sgbBal">0.00</span>
                    <span class="balance-label">SGB</span>
                </div>
                <div class="balance-item">
                    <span class="balance-value" id="pondBal">0.00</span>
                    <span class="balance-label">POND</span>
                </div>
            </div>
            <button class="connect-btn" id="connectBtn">Connect Wallet</button>
            <button class="notification-btn" id="notifBtn">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                    <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                </svg>
                <span class="notif-badge" id="notifBadge">0</span>
            </button>
        </div>
    </header>

    <!-- Mobile Nav -->
    <nav class="mobile-nav">
        <button class="mobile-nav-btn active" data-tab="collections">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
            <span>Collections</span>
        </button>
        <button class="mobile-nav-btn" data-tab="my-nfts">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
            <span>My NFTs</span>
        </button>
        <button class="mobile-nav-btn" data-tab="staking">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5z"></path><path d="M2 17l10 5 10-5"></path><path d="M2 12l10 5 10-5"></path></svg>
            <span>Staking</span>
        </button>
        <button class="mobile-nav-btn" data-tab="lp">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><path d="M8 12h8"></path><path d="M12 8v8"></path></svg>
            <span>LP</span>
        </button>
    </nav>

    <!-- Main Content -->
    <main class="main">
        <!-- Collections Tab -->
        <div class="tab-content active" id="tab-collections">
            <!-- Featured Banner -->
            <div class="featured-banner">
                <div class="featured-text">
                    <h1>Zero-Fee NFT Trading</h1>
                    <p>Stake NFTs for LP multipliers. All fees flow to stakers.</p>
                </div>
                <div class="featured-stats">
                    <div class="feat-stat">
                        <span class="feat-value" id="totalVolume">0</span>
                        <span class="feat-label">Total Volume</span>
                    </div>
                    <div class="feat-stat">
                        <span class="feat-value" id="totalNfts">30,000</span>
                        <span class="feat-label">NFTs</span>
                    </div>
                    <div class="feat-stat">
                        <span class="feat-value" id="totalStaked">0</span>
                        <span class="feat-label">Staked</span>
                    </div>
                </div>
            </div>

            <!-- Collection Filters -->
            <div class="filters">
                <div class="filter-tabs">
                    <button class="filter-btn active" data-filter="featured">Featured</button>
                    <button class="filter-btn" data-filter="all">All Collections</button>
                </div>
                <div class="sort-dropdown">
                    <select id="sortCollections">
                        <option value="volume">Volume</option>
                        <option value="floor">Floor Price</option>
                        <option value="name">Name</option>
                    </select>
                </div>
            </div>

            <!-- Collections Grid -->
            <div class="collections-grid" id="collectionsGrid">
                <!-- Populated by JS -->
            </div>
        </div>

        <!-- My NFTs Tab -->
        <div class="tab-content" id="tab-my-nfts">
            <div class="my-nfts-header">
                <h2>My NFTs</h2>
                <div class="my-nfts-actions">
                    <button class="action-btn" id="stakeAllBtn">Stake All</button>
                </div>
            </div>
            <div class="my-nfts-grid" id="myNftsGrid">
                <div class="empty-state" id="noNftsMsg">
                    <p>Connect wallet to view your NFTs</p>
                </div>
            </div>
        </div>

        <!-- Staking Tab -->
        <div class="tab-content" id="tab-staking">
            <div class="staking-header">
                <h2>NFT Staking</h2>
                <p class="staking-sub">Stake NFTs to earn daily POND rewards + boost your LP position.</p>
            </div>
            
            <div class="staking-stats">
                <div class="stake-stat-box">
                    <span class="stake-stat-value" id="myStakedCount">0</span>
                    <span class="stake-stat-label">NFTs Staked</span>
                </div>
                <div class="stake-stat-box highlight">
                    <span class="stake-stat-value" id="myMultiplier">1.0x</span>
                    <span class="stake-stat-label">LP Multiplier</span>
                </div>
                <div class="stake-stat-box">
                    <span class="stake-stat-value" id="stakingRewards">0 POND</span>
                    <span class="stake-stat-label">Pending Rewards</span>
                </div>
            </div>

            <div class="staking-actions">
                <button class="stake-action-btn" id="unstakeAllBtn">Unstake All</button>
                <button class="stake-action-btn primary" id="claimStakeRewardsBtn">Claim Rewards</button>
            </div>

            <h3 class="section-title">Your Staked NFTs</h3>
            <div class="staked-nfts-grid" id="stakedNftsGrid">
                <div class="empty-state">
                    <p>No NFTs staked yet</p>
                </div>
            </div>
        </div>

        <!-- LP Tab -->
        <div class="tab-content" id="tab-lp">
            <div class="lp-container">
                <div class="lp-header">
                    <h2>Universal Liquidity Pool</h2>
                    <p>The engine powering the Toadz ecosystem. Deposit SGB + POND, earn from all platform activity.</p>
                </div>
                
                <div class="lp-info-grid">
                    <div class="lp-info-box">
                        <span class="lp-info-value" id="lpTvl">$0</span>
                        <span class="lp-info-label">Total Value Locked</span>
                    </div>
                    <div class="lp-info-box">
                        <span class="lp-info-value" id="lpApy">0%</span>
                        <span class="lp-info-label">Est. APY</span>
                    </div>
                    <div class="lp-info-box">
                        <span class="lp-info-value" id="lpYourShare">0%</span>
                        <span class="lp-info-label">Your Share</span>
                    </div>
                </div>

                <div class="lp-cta">
                    <a href="https://xtoadz.club" target="_blank" class="lp-link-btn">Manage LP Position →</a>
                </div>

                <div class="lp-multiplier-info">
                    <h3>LP Multipliers</h3>
                    <p>Stake NFTs to boost your LP rewards:</p>
                    <ul class="multiplier-list">
                        <li><span class="mult-badge">+0.1%</span> per NFT staked (any collection)</li>
                        <li><span class="mult-badge">Max +100%</span> bonus (1000 NFTs)</li>
                        <li><span class="mult-badge">3.5x</span> maximum total multiplier</li>
                    </ul>
                    <p class="multiplier-note">Combined with time-lock bonuses (1x-2.5x), earn up to 3.5x rewards.</p>
                </div>
            </div>
        </div>

        <!-- Governance Tab -->
        <div class="tab-content" id="tab-governance">
            <div class="gov-container">
                <div class="gov-header">
                    <h2>Governance</h2>
                    <p>LP holders and NFT stakers govern the protocol.</p>
                </div>
                
                <div class="gov-power">
                    <div class="gov-power-box">
                        <span class="gov-power-value" id="govVotingPower">0</span>
                        <span class="gov-power-label">Your Voting Power</span>
                    </div>
                </div>

                <div class="gov-breakdown">
                    <h3>Power Breakdown</h3>
                    <div class="power-row">
                        <span>LP Position</span>
                        <span id="govLpPower">0</span>
                    </div>
                    <div class="power-row">
                        <span>Staked NFTs</span>
                        <span id="govNftPower">0</span>
                    </div>
                </div>

                <div class="proposals-section">
                    <h3>Active Proposals</h3>
                    <div class="proposals-list" id="proposalsList">
                        <div class="empty-state">
                            <p>No active proposals</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </main>

    <!-- NFT Detail Modal -->
    <div class="modal-overlay" id="nftModal">
        <div class="modal-content">
            <button class="modal-close" id="modalClose">×</button>
            <div class="modal-body">
                <div class="modal-image">
                    <img id="modalNftImage" src="" alt="">
                </div>
                <div class="modal-info">
                    <h2 id="modalNftName">NFT Name</h2>
                    <p class="modal-collection" id="modalCollection">Collection</p>
                    
                    <div class="modal-traits" id="modalTraits">
                        <!-- Traits populated by JS -->
                    </div>

                    <div class="modal-price-section" id="modalPriceSection">
                        <div class="modal-price">
                            <span class="price-label">Price</span>
                            <span class="price-value" id="modalPrice">Not Listed</span>
                        </div>
                    </div>

                    <div class="modal-actions" id="modalActions">
                        <!-- Actions populated by JS based on ownership/listing status -->
                    </div>

                    <div class="modal-history" id="modalHistory">
                        <h4>Activity</h4>
                        <div class="history-list" id="historyList">
                            <!-- History populated by JS -->
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- Listing Modal -->
    <div class="modal-overlay" id="listingModal">
        <div class="modal-content" style="max-width: 400px;">
            <button class="modal-close" onclick="closeListingModal()">×</button>
            <div class="modal-body" style="padding: 24px;">
                <h2 style="margin-bottom: 8px;">List NFT for Sale</h2>
                <p id="listingNftName" style="color: var(--text-muted); margin-bottom: 24px;">NFT #123</p>
                
                <div style="margin-bottom: 16px;">
                    <label style="display: block; margin-bottom: 8px; color: var(--text-muted); font-size: 13px;">Price in SGB (leave empty to not accept)</label>
                    <input type="number" id="listingPriceSGB" placeholder="0.00" step="0.01" min="0" 
                           style="width: 100%; padding: 12px; border-radius: 8px; border: 1px solid var(--border); background: var(--bg-card); color: white; font-size: 16px;">
                </div>
                
                <div style="margin-bottom: 24px;">
                    <label style="display: block; margin-bottom: 8px; color: var(--text-muted); font-size: 13px;">Price in POND (leave empty to not accept)</label>
                    <input type="number" id="listingPricePOND" placeholder="0.00" step="1" min="0"
                           style="width: 100%; padding: 12px; border-radius: 8px; border: 1px solid var(--border); background: var(--bg-card); color: white; font-size: 16px;">
                </div>
                
                <p style="color: var(--text-muted); font-size: 12px; margin-bottom: 16px;">5% fee on sales. Set at least one price.</p>
                
                <div style="display: flex; gap: 12px;">
                    <button class="modal-btn secondary" onclick="closeListingModal()" style="flex: 1;">Cancel</button>
                    <button class="modal-btn primary" id="confirmListingBtn" onclick="confirmListing()" style="flex: 1;">List NFT</button>
                </div>
            </div>
        </div>
    </div>

    <!-- Toast Notifications -->
    <div class="toast-container" id="toastContainer"></div>

    <!-- Scripts -->
    <script src="https://cdn.jsdelivr.net/npm/ethers@5.7.2/dist/ethers.umd.min.js"></script>
    <script src="contracts.js"></script>
    <script src="app.js"></script>
</body>
</html>
