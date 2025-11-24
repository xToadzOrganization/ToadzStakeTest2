// ==================== NETWORK CONFIG ====================
const SONGBIRD_RPC = 'https://songbird-api.flare.network/ext/C/rpc';
const SONGBIRD_CHAIN_ID = 19;

// ==================== CONTRACT ADDRESSES ====================
const CONTRACTS = {
    // Tokens
    pondToken: '0x39fec3F97668e393862Dbb3C442f3Dd3d5016D69',
    wsgb: '0x02f0826ef6aD107Cfc861152B32B52fD11BaB9ED',
    
    // LP Pool
    pondPool: '0xBe942e51AB1617AFfe7E40F2f7bD4b022548e1Bd',
    
    // NFT Collections (stakeable for multipliers)
    sToadz: '0x35afb6Ba51839dEDD33140A3b704b39933D1e642',
    luxuryLofts: '0x91Aa85a172DD3e7EEA4ad1A4B33E90cbF3B99ed8',
    songbirdCity: '0x360f8B7d9530F55AB8E52394E6527935635f51E7',
    
    // NFT Staking Contract (TODO: update after deployment)
    nftStaking: '0xAC3E3651a4FA87784dee501a962aBD5005EebB64',
    
    // Marketplace Contract (TODO: deploy)
    marketplace: '0x0000000000000000000000000000000000000000'
};

// ==================== COLLECTION METADATA ====================
const COLLECTIONS = [
    {
        address: CONTRACTS.sToadz,
        name: 'sToadz',
        symbol: 'STOADZ',
        supply: 10000,
        description: 'The original toad collection on Songbird. Stake for POND rewards + LP boost.',
        image: 'https://ipfs.io/ipfs/QmP45Rfhy75RybFuLcwd1CR9vF6qznw95qQPxcA5TeBNYk/1.png',
        baseUri: 'https://ipfs.io/ipfs/QmP45Rfhy75RybFuLcwd1CR9vF6qznw95qQPxcA5TeBNYk/',
        thumbnailUri: 'https://ipfs.io/ipfs/QmP45Rfhy75RybFuLcwd1CR9vF6qznw95qQPxcA5TeBNYk/',
        featured: true,
        jsonFile: '0x35afb6Ba51839dEDD33140A3b704b39933D1e642.json'
    },
    {
        address: CONTRACTS.luxuryLofts,
        name: 'Luxury Lofts',
        symbol: 'LOFT',
        supply: 10000,
        description: 'Premium real estate on Songbird. Stake for POND rewards + LP boost.',
        image: 'https://ipfs.io/ipfs/QmZ42mWPA3xihoQxnm7ufKh51n5fhJe7hwfN7VPfy4cZcg',
        baseUri: 'https://ipfs.io/ipfs/QmZ42mWPA3xihoQxnm7ufKh51n5fhJe7hwfN7VPfy4cZcg/',
        featured: true,
        jsonFile: '0x91Aa85a172DD3e7EEA4ad1A4B33E90cbF3B99ed8.json'
    },
    {
        address: CONTRACTS.songbirdCity,
        name: 'Songbird City',
        symbol: 'SBCITY',
        supply: 10000,
        description: 'Urban NFTs on Songbird Network. Stake for POND rewards + LP boost.',
        image: 'https://ipfs.io/ipfs/QmY5ZwdLP4z2PBXmRgh3djcDYzWvMuizyqfTDhPnXErgBm',
        baseUri: 'https://ipfs.io/ipfs/QmY5ZwdLP4z2PBXmRgh3djcDYzWvMuizyqfTDhPnXErgBm',
        featured: true,
        jsonFile: '0x360f8B7d9530F55AB8E52394E6527935635f51E7.json'
    }
];

// ==================== ABIs ====================
const ERC721_ABI = [
    'function balanceOf(address owner) view returns (uint256)',
    'function ownerOf(uint256 tokenId) view returns (address)',
    'function tokenOfOwnerByIndex(address owner, uint256 index) view returns (uint256)',
    'function tokenURI(uint256 tokenId) view returns (string)',
    'function approve(address to, uint256 tokenId)',
    'function setApprovalForAll(address operator, bool approved)',
    'function isApprovedForAll(address owner, address operator) view returns (bool)',
    'function safeTransferFrom(address from, address to, uint256 tokenId)',
    'function name() view returns (string)',
    'function symbol() view returns (string)',
    'function totalSupply() view returns (uint256)'
];

const ERC20_ABI = [
    'function balanceOf(address owner) view returns (uint256)',
    'function allowance(address owner, address spender) view returns (uint256)',
    'function approve(address spender, uint256 amount) returns (bool)',
    'function transfer(address to, uint256 amount) returns (bool)',
    'function decimals() view returns (uint8)',
    'function symbol() view returns (string)'
];

const PONDPOOL_ABI = [
    'function reserveSGB() view returns (uint256)',
    'function reservePOND() view returns (uint256)',
    'function getUserInfo(address user) view returns (uint256 sgbDeposited, uint256 pondDeposited, uint256 lockTier, uint256 lockExpires, uint256 weightedShares, uint256 poolShareBps, uint256 multiplier, uint256 pendingPond, uint256 pendingSgb, uint256 claimableIn)',
    'function addLiquidity(uint256 pondAmount, uint8 lockTier) payable',
    'function addMore(uint256 pondAmount) payable',
    'function removeLiquidity()',
    'function claimPondRewards()',
    'function claimSgbRewards()',
    'function swapSgbForPond() payable returns (uint256)',
    'function swapPondForSgb(uint256 pondAmount) returns (uint256)'
];

// NFT Staking ABI
const NFT_STAKING_ABI = [
    'function stake(address collection, uint256 tokenId)',
    'function stakeBatch(address collection, uint256[] tokenIds)',
    'function unstake(address collection, uint256 tokenId)',
    'function unstakeBatch(address collection, uint256[] tokenIds)',
    'function unstakeAll()',
    'function claimRewards()',
    'function getStakedNFTCount(address user) view returns (uint256)',
    'function getStakedTokens(address user, address collection) view returns (uint256[])',
    'function pendingRewards(address user) view returns (uint256)',
    'function getUserStats(address user) view returns (uint256 totalStaked, uint256 stakedSToadz, uint256 stakedLofts, uint256 stakedCity, uint256 pendingPond)',
    'function getGlobalStats() view returns (uint256 totalNFTsStaked, uint256 dailyReward, uint256 rewardPerNFTPerDay, uint256 contractPondBalance)',
    'function totalStakedNFTs() view returns (uint256)',
    'function dailyRewardAmount() view returns (uint256)'
];

// Marketplace ABI (placeholder - update when contract deployed)
const MARKETPLACE_ABI = [
    'function listNFT(address collection, uint256 tokenId, uint256 price)',
    'function cancelListing(address collection, uint256 tokenId)',
    'function buyNFT(address collection, uint256 tokenId) payable',
    'function makeOffer(address collection, uint256 tokenId, uint256 price) payable',
    'function acceptOffer(address collection, uint256 tokenId, address offerer)',
    'function cancelOffer(address collection, uint256 tokenId)',
    'function getListing(address collection, uint256 tokenId) view returns (address seller, uint256 price, bool active)',
    'function getOffers(address collection, uint256 tokenId) view returns (tuple(address offerer, uint256 price, uint256 timestamp)[])'
];
