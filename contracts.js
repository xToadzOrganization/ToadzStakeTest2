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
    
    // External Collections
    fatCats: '0x0e759aa7166ab3b2b81abd6d9ed16ac83368f97e',
    fatLeopards: '0x12c40516c7bf32002FF0e3431082C9e28Ab76066',
    fatTigers: '0xFdD87A263ba929E14Dd0A2D879D9C66d5c8fF3ae',
    theOracles: '0xCdB019C0990c033724DA55f5A04bE6fd6ec1809d',
    sparklesGenesis: '0xd167c20575c284dF75BCfe1794d54d3E057Cd4EC',
    songbirdPunks: '0xd83Ae2C70916a2360e23683A0d3a3556b2c09935',
    doodcats: '0x279a222a18C033124Ab02290dDec97912A8b7185',
    bazookaChicks: '0x2972ea6e6CC45c5837CE909DeF032DD325B48415',
    grumpyMonkeys: '0x972edfF4D09a4fd8ABDe8e8f669B7e1E3B1f7e3D',
    cybrs: '0x34FF649D709ccCEc77bCf433317176fD13246296',
    superBadBabies: '0x23A18A46c67301864f5b341e87f89B8Ccb690c44',
    superBadGenesis: '0xf4b4D366f9B4855690Bb7530abC76C857B259093',
    innerCircle888: '0xfF063937523c4514179A4d9A6769694bAab357A8',
    theGrungies: '0x4F52A074De9f2651d2f711FEe63FEe9E3b439A7e',
    theSenators: '0x927463265eDE6a52604D179d7110B7B2fc057a3f',
    fort: '0x3157537399860305ebE9e7fd17cfA00AAE291c82',
    
    // NFT Staking Contract
    nftStaking: '0xAC3E3651a4FA87784dee501a962aBD5005EebB64',
    
    // Marketplace Contract
    marketplace: '0xc99c294224BCB259F1860F0EeaABa664b29d1633'
};

// ==================== COLLECTION METADATA ====================
const COLLECTIONS = [
    // === POND Protocol Collections (stakeable) ===
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
        stakeable: true,
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
        stakeable: true,
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
        stakeable: true,
        jsonFile: '0x360f8B7d9530F55AB8E52394E6527935635f51E7.json'
    },
    
    // === Fat Family ===
    {
        address: CONTRACTS.fatCats,
        name: 'The Fat Cats',
        symbol: 'FATCAT',
        supply: 1000,
        description: 'The original Fat Cats on Songbird.',
        image: 'https://dweb.link/ipfs/QmQFNZXPuL4efM8Dp5j2bme6zySaYEYTNmn1CF2KjAja2A/1.png',
        baseUri: 'https://ipfs.io/ipfs/QmSDmNVAXnEandkTaCpiU4wEBzp7Hjv8Wyy8ZHb9BPzYWo/',
        featured: false,
        jsonFile: '0x0e759aa7166ab3b2b81abd6d9ed16ac83368f97e.json'
    },
    {
        address: CONTRACTS.fatLeopards,
        name: 'The Fat Leopards',
        symbol: 'FATLEOPARD',
        supply: 3000,
        description: 'Fat Leopards on Songbird.',
        image: 'https://ipfs.io/ipfs/QmeW1iCPC4zyFkfFMarhWosUwXYmBTg1PaYEcZv2GtoreY/1.png',
        baseUri: 'https://ipfs.io/ipfs/QmeW1iCPC4zyFkfFMarhWosUwXYmBTg1PaYEcZv2GtoreY/',
        thumbnailUri: 'https://ipfs.io/ipfs/QmeW1iCPC4zyFkfFMarhWosUwXYmBTg1PaYEcZv2GtoreY/',
        featured: false,
        jsonFile: '0x12c40516c7bf32002ff0e3431082c9e28ab76066.json'
    },
    {
        address: CONTRACTS.fatTigers,
        name: 'Fat Tigers',
        symbol: 'FATTIGER',
        supply: 6000,
        description: 'Fat Tigers on Songbird.',
        image: 'https://ipfs.io/ipfs/QmYuLjrHG9dDDc8bYSjkS7F2Tefx9otDkA8ET7nfPdaT4n/1.png',
        baseUri: 'https://ipfs.io/ipfs/QmYuLjrHG9dDDc8bYSjkS7F2Tefx9otDkA8ET7nfPdaT4n/',
        thumbnailUri: 'https://ipfs.io/ipfs/QmYuLjrHG9dDDc8bYSjkS7F2Tefx9otDkA8ET7nfPdaT4n/',
        featured: false,
        jsonFile: '0xfdd87a263ba929e14dd0a2d879d9c66d5c8ff3ae.json'
    },
    
    // === Other Popular Collections ===
    {
        address: CONTRACTS.theOracles,
        name: 'The Oracles',
        symbol: 'ORACLE',
        supply: 22222,
        description: 'The Oracles collection on Songbird.',
        image: 'https://ipfs.io/ipfs/QmV3yAjc2WXQNZycGq3G8B6KGfNZutJFcQM3UuCRiXYgBH/1.png',
        baseUri: 'https://ipfs.io/ipfs/QmV3yAjc2WXQNZycGq3G8B6KGfNZutJFcQM3UuCRiXYgBH/',
        thumbnailUri: 'https://ipfs.io/ipfs/QmV3yAjc2WXQNZycGq3G8B6KGfNZutJFcQM3UuCRiXYgBH/',
        featured: false,
        jsonFile: '0xcdb019c0990c033724da55f5a04be6fd6ec1809d.json'
    },
    {
        address: CONTRACTS.sparklesGenesis,
        name: 'Sparkles Genesis',
        symbol: 'SPARKLE',
        supply: 9999,
        description: 'Sparkles Genesis collection.',
        image: 'https://ipfs.io/ipfs/QmXe2RLWnagcD62nSxr45CwA9vPKVNoALwazY9UbiVNF6g/1.png',
        baseUri: 'https://ipfs.io/ipfs/QmXe2RLWnagcD62nSxr45CwA9vPKVNoALwazY9UbiVNF6g/',
        thumbnailUri: 'https://ipfs.io/ipfs/QmXe2RLWnagcD62nSxr45CwA9vPKVNoALwazY9UbiVNF6g/',
        featured: false,
        jsonFile: '0xd167c20575c284df75bcfe1794d54d3e057cd4ec.json'
    },
    {
        address: CONTRACTS.songbirdPunks,
        name: 'Songbird Punks',
        symbol: 'SBPUNK',
        supply: 20000,
        description: 'Punk-style NFTs on Songbird.',
        image: 'https://ipfs.io/ipfs/QmVEABGSJp2YSXYdULyJuiJLLbeSrexf2iY3zmZrecc5u8/1.png',
        baseUri: 'https://ipfs.io/ipfs/QmVEABGSJp2YSXYdULyJuiJLLbeSrexf2iY3zmZrecc5u8/',
        thumbnailUri: 'https://ipfs.io/ipfs/QmVEABGSJp2YSXYdULyJuiJLLbeSrexf2iY3zmZrecc5u8/',
        featured: false,
        jsonFile: '0xd83ae2c70916a2360e23683a0d3a3556b2c09935.json'
    },
    {
        address: CONTRACTS.doodcats,
        name: 'doodcats',
        symbol: 'DOODCAT',
        supply: 10000,
        description: 'Doodle cats on Songbird.',
        image: 'https://ipfs.io/ipfs/QmdjzdH9N5QYpBVRc3FoKo2z77piHHrzh6QstztVA8TfyE/1.png',
        baseUri: 'https://ipfs.io/ipfs/QmdjzdH9N5QYpBVRc3FoKo2z77piHHrzh6QstztVA8TfyE/',
        thumbnailUri: 'https://ipfs.io/ipfs/QmdjzdH9N5QYpBVRc3FoKo2z77piHHrzh6QstztVA8TfyE/',
        featured: false,
        jsonFile: '0x279a222a18c033124ab02290ddec97912a8b7185.json'
    },
    {
        address: CONTRACTS.bazookaChicks,
        name: 'Bazooka Chicks',
        symbol: 'BAZOOKA',
        supply: 10000,
        description: 'Bazooka Chicks on Songbird.',
        image: 'https://ipfs.io/ipfs/QmNSQh2m4aozJESozZnCj37szuiRvyab57Nkqd25HeGMHY/1.png',
        baseUri: 'https://ipfs.io/ipfs/QmNSQh2m4aozJESozZnCj37szuiRvyab57Nkqd25HeGMHY/',
        thumbnailUri: 'https://ipfs.io/ipfs/QmNSQh2m4aozJESozZnCj37szuiRvyab57Nkqd25HeGMHY/',
        featured: false,
        jsonFile: '0x2972ea6e6cc45c5837ce909def032dd325b48415.json'
    },
    {
        address: CONTRACTS.grumpyMonkeys,
        name: 'Grumpy Monkeys',
        symbol: 'GRUMPY',
        supply: 1000,
        description: 'Grumpy Monkeys on Songbird.',
        image: 'https://ipfs.io/ipfs/QmQQ1aSzdZaZ1KBR8dWJbnPN1BnFvr3ATtG2BcpeHvgND6/1.png',
        baseUri: 'https://ipfs.io/ipfs/QmQQ1aSzdZaZ1KBR8dWJbnPN1BnFvr3ATtG2BcpeHvgND6/',
        thumbnailUri: 'https://ipfs.io/ipfs/QmQQ1aSzdZaZ1KBR8dWJbnPN1BnFvr3ATtG2BcpeHvgND6/',
        featured: false,
        jsonFile: '0x972edff4d09a4fd8abde8e8f669b7e1e3b1f7e3d.json'
    },
    {
        address: CONTRACTS.cybrs,
        name: 'CYBRs',
        symbol: 'CYBR',
        supply: 20000,
        description: 'CYBRs on Songbird.',
        image: 'https://ipfs.io/ipfs/QmV6fgsPwsT3kbUPoHyeMrZ7Cx761pmMg82sKLgghAVeKy/1',
        baseUri: 'https://ipfs.io/ipfs/QmV6fgsPwsT3kbUPoHyeMrZ7Cx761pmMg82sKLgghAVeKy/',
        thumbnailUri: 'https://ipfs.io/ipfs/QmV6fgsPwsT3kbUPoHyeMrZ7Cx761pmMg82sKLgghAVeKy/',
        featured: false,
        jsonFile: '0x34ff649d709cccec77bcf433317176fd13246296.json'
    },
    {
        address: CONTRACTS.superBadBabies,
        name: 'Super Bad Babies',
        symbol: 'SBB',
        supply: 3333,
        description: 'Super Bad Babies on Songbird.',
        image: 'https://ipfs.io/ipfs/QmbkGuLePd9rgtyfzkV5iJnbKEYhkd4R6zcyQ9X9X6g12Q/1.png',
        baseUri: 'https://ipfs.io/ipfs/QmbkGuLePd9rgtyfzkV5iJnbKEYhkd4R6zcyQ9X9X6g12Q/',
        thumbnailUri: 'https://ipfs.io/ipfs/QmbkGuLePd9rgtyfzkV5iJnbKEYhkd4R6zcyQ9X9X6g12Q/',
        featured: false,
        jsonFile: '0x23a18a46c67301864f5b341e87f89b8ccb690c44.json'
    },
    {
        address: CONTRACTS.superBadGenesis,
        name: 'Super Bad Genesis Seed',
        symbol: 'SBGS',
        supply: 666,
        description: 'Super Bad Genesis Seed on Songbird.',
        image: 'https://ipfs.io/ipfs/QmPWDzHNbD6QghZ5ajRELFjKNQWSRh4G3qjfYjkgUPfqNX/1.png',
        baseUri: 'https://ipfs.io/ipfs/QmPWDzHNbD6QghZ5ajRELFjKNQWSRh4G3qjfYjkgUPfqNX/',
        thumbnailUri: 'https://ipfs.io/ipfs/QmPWDzHNbD6QghZ5ajRELFjKNQWSRh4G3qjfYjkgUPfqNX/',
        featured: false,
        jsonFile: '0xf4b4d366f9b4855690bb7530abc76c857b259093.json'
    },
    {
        address: CONTRACTS.innerCircle888,
        name: '888 Inner Circle',
        symbol: '888IC',
        supply: 4086,
        description: '888 Inner Circle - White Realm.',
        image: 'https://ipfs.io/ipfs/QmNiEd6pymnSambZraBWn5NCqGXUJwbUFxKHW1mhUX7Vxw/1',
        baseUri: 'https://ipfs.io/ipfs/QmNiEd6pymnSambZraBWn5NCqGXUJwbUFxKHW1mhUX7Vxw/',
        thumbnailUri: 'https://ipfs.io/ipfs/QmNiEd6pymnSambZraBWn5NCqGXUJwbUFxKHW1mhUX7Vxw/',
        featured: false,
        jsonFile: '0xff063937523c4514179a4d9a6769694baab357a8.json'
    },
    {
        address: CONTRACTS.theGrungies,
        name: 'The Grungies',
        symbol: 'GRUNGIE',
        supply: 1990,
        description: 'The Grungies on Songbird.',
        image: 'https://ipfs.io/ipfs/bafybeigl7q35qc5bqgcpwtjs6dpahquf4iloyd34taidrwhdkvgz2czzeu/1.png',
        baseUri: 'https://ipfs.io/ipfs/bafybeigl7q35qc5bqgcpwtjs6dpahquf4iloyd34taidrwhdkvgz2czzeu/',
        thumbnailUri: 'https://ipfs.io/ipfs/bafybeigl7q35qc5bqgcpwtjs6dpahquf4iloyd34taidrwhdkvgz2czzeu/',
        featured: false,
        jsonFile: '0x4f52a074de9f2651d2f711fee63fee9e3b439a7e.json'
    },
    {
        address: CONTRACTS.theSenators,
        name: 'The Senators',
        symbol: 'SENATOR',
        supply: 350,
        description: 'The Senators - Satraps Collection.',
        image: 'https://ipfs.io/ipfs/bafybeia3lq7i5jfprtohxiqtmy5olprhwchs4zih3vmerz5zueudjij5hu/1.png',
        baseUri: 'https://ipfs.io/ipfs/bafybeia3lq7i5jfprtohxiqtmy5olprhwchs4zih3vmerz5zueudjij5hu/',
        thumbnailUri: 'https://ipfs.io/ipfs/bafybeia3lq7i5jfprtohxiqtmy5olprhwchs4zih3vmerz5zueudjij5hu/',
        featured: false,
        jsonFile: '0x927463265ede6a52604d179d7110b7b2fc057a3f.json'
    },
    {
        address: CONTRACTS.fort,
        name: 'FORT',
        symbol: 'FORT',
        supply: 52,
        description: 'FORT collection on Songbird.',
        image: 'https://ipfs.io/ipfs/Qmbdb3opaLGKqJi1yD5uAohJMVmqSgArQvZVohEuW6YddB/1.json',
        baseUri: 'https://ipfs.io/ipfs/Qmbdb3opaLGKqJi1yD5uAohJMVmqSgArQvZVohEuW6YddB/',
        thumbnailUri: 'https://ipfs.io/ipfs/Qmbdb3opaLGKqJi1yD5uAohJMVmqSgArQvZVohEuW6YddB/',
        featured: false,
        jsonFile: '0x3157537399860305ebe9e7fd17cfa00aae291c82.json'
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
    'function dailyRewardAmount() view returns (uint256)',
    'event Staked(address indexed user, address indexed collection, uint256 tokenId)'
];

// Marketplace ABI
const MARKETPLACE_ABI = [
    'function list(address collection, uint256 tokenId, uint256 priceSGB, uint256 pricePOND)',
    'function unlist(address collection, uint256 tokenId)',
    'function updateListing(address collection, uint256 tokenId, uint256 newPriceSGB, uint256 newPricePOND)',
    'function buyWithSGB(address collection, uint256 tokenId) payable',
    'function buyWithPOND(address collection, uint256 tokenId)',
    'function makeOffer(address collection, uint256 tokenId, uint256 amountPOND, uint256 duration) payable',
    'function cancelOffer(address collection, uint256 tokenId, uint256 offerIndex)',
    'function acceptOffer(address collection, uint256 tokenId, uint256 offerIndex)',
    'function getListing(address collection, uint256 tokenId) view returns (address seller, uint256 priceSGB, uint256 pricePOND, bool active)',
    'function getOffers(address collection, uint256 tokenId) view returns (tuple(address buyer, uint256 amountSGB, uint256 amountPOND, uint256 expiry)[])',
    'function getStats() view returns (uint256 volumeSGB, uint256 volumePOND, uint256 sales)',
    'function getCollectionStats(address collection) view returns (uint256 volumeSGB, uint256 volumePOND, uint256 sales)',
    'function getActiveListings(address collection) view returns (uint256[])',
    'function getActiveListingCount(address collection) view returns (uint256)',
    'event Listed(address indexed collection, uint256 indexed tokenId, address indexed seller, uint256 priceSGB, uint256 pricePOND)',
    'event Unlisted(address indexed collection, uint256 indexed tokenId, address indexed seller)',
    'event Sold(address indexed collection, uint256 indexed tokenId, address seller, address indexed buyer, uint256 priceSGB, uint256 pricePOND)',
    'event OfferMade(address indexed collection, uint256 indexed tokenId, address indexed buyer, uint256 amountSGB, uint256 amountPOND, uint256 expiry)',
    'event OfferAccepted(address indexed collection, uint256 indexed tokenId, address seller, address indexed buyer, uint256 amountSGB, uint256 amountPOND)',
    'event OfferCancelled(address indexed collection, uint256 indexed tokenId, address indexed buyer)'
];// ==================== NETWORK CONFIG ====================
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
    
    // External Collections
    fatCats: '0x0e759aa7166ab3b2b81abd6d9ed16ac83368f97e',
    fatLeopards: '0x12c40516c7bf32002FF0e3431082C9e28Ab76066',
    fatTigers: '0xFdD87A263ba929E14Dd0A2D879D9C66d5c8fF3ae',
    theOracles: '0xCdB019C0990c033724DA55f5A04bE6fd6ec1809d',
    sparklesGenesis: '0xd167c20575c284dF75BCfe1794d54d3E057Cd4EC',
    songbirdPunks: '0xd83Ae2C70916a2360e23683A0d3a3556b2c09935',
    doodcats: '0x279a222a18C033124Ab02290dDec97912A8b7185',
    bazookaChicks: '0x2972ea6e6CC45c5837CE909DeF032DD325B48415',
    grumpyMonkeys: '0x972edfF4D09a4fd8ABDe8e8f669B7e1E3B1f7e3D',
    cybrs: '0x34FF649D709ccCEc77bCf433317176fD13246296',
    superBadBabies: '0x23A18A46c67301864f5b341e87f89B8Ccb690c44',
    superBadGenesis: '0xf4b4D366f9B4855690Bb7530abC76C857B259093',
    innerCircle888: '0xfF063937523c4514179A4d9A6769694bAab357A8',
    theGrungies: '0x4F52A074De9f2651d2f711FEe63FEe9E3b439A7e',
    theSenators: '0x927463265eDE6a52604D179d7110B7B2fc057a3f',
    fort: '0x3157537399860305ebE9e7fd17cfA00AAE291c82',
    
    // NFT Staking Contract
    nftStaking: '0xAC3E3651a4FA87784dee501a962aBD5005EebB64',
    
    // Marketplace Contract
    marketplace: '0xc99c294224BCB259F1860F0EeaABa664b29d1633'
};

// ==================== COLLECTION METADATA ====================
const COLLECTIONS = [
    // === POND Protocol Collections (stakeable) ===
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
        stakeable: true,
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
        stakeable: true,
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
        stakeable: true,
        jsonFile: '0x360f8B7d9530F55AB8E52394E6527935635f51E7.json'
    },
    
    // === Fat Family ===
    {
        address: CONTRACTS.fatCats,
        name: 'The Fat Cats',
        symbol: 'FATCAT',
        supply: 1000,
        description: 'The original Fat Cats on Songbird.',
        image: 'https://dweb.link/ipfs/QmQFNZXPuL4efM8Dp5j2bme6zySaYEYTNmn1CF2KjAja2A/1.png',
        baseUri: 'https://ipfs.io/ipfs/QmSDmNVAXnEandkTaCpiU4wEBzp7Hjv8Wyy8ZHb9BPzYWo/',
        featured: false,
        jsonFile: '0x0e759aa7166ab3b2b81abd6d9ed16ac83368f97e.json'
    },
    {
        address: CONTRACTS.fatLeopards,
        name: 'The Fat Leopards',
        symbol: 'FATLEOPARD',
        supply: 3000,
        description: 'Fat Leopards on Songbird.',
        image: 'https://ipfs.io/ipfs/QmeW1iCPC4zyFkfFMarhWosUwXYmBTg1PaYEcZv2GtoreY/1.png',
        baseUri: 'https://ipfs.io/ipfs/QmeW1iCPC4zyFkfFMarhWosUwXYmBTg1PaYEcZv2GtoreY/',
        thumbnailUri: 'https://ipfs.io/ipfs/QmeW1iCPC4zyFkfFMarhWosUwXYmBTg1PaYEcZv2GtoreY/',
        featured: false,
        jsonFile: '0x12c40516c7bf32002ff0e3431082c9e28ab76066.json'
    },
    {
        address: CONTRACTS.fatTigers,
        name: 'Fat Tigers',
        symbol: 'FATTIGER',
        supply: 6000,
        description: 'Fat Tigers on Songbird.',
        image: 'https://ipfs.io/ipfs/QmYuLjrHG9dDDc8bYSjkS7F2Tefx9otDkA8ET7nfPdaT4n/1.png',
        baseUri: 'https://ipfs.io/ipfs/QmYuLjrHG9dDDc8bYSjkS7F2Tefx9otDkA8ET7nfPdaT4n/',
        thumbnailUri: 'https://ipfs.io/ipfs/QmYuLjrHG9dDDc8bYSjkS7F2Tefx9otDkA8ET7nfPdaT4n/',
        featured: false,
        jsonFile: '0xfdd87a263ba929e14dd0a2d879d9c66d5c8ff3ae.json'
    },
    
    // === Other Popular Collections ===
    {
        address: CONTRACTS.theOracles,
        name: 'The Oracles',
        symbol: 'ORACLE',
        supply: 22222,
        description: 'The Oracles collection on Songbird.',
        image: 'https://ipfs.io/ipfs/QmV3yAjc2WXQNZycGq3G8B6KGfNZutJFcQM3UuCRiXYgBH/1.png',
        baseUri: 'https://ipfs.io/ipfs/QmV3yAjc2WXQNZycGq3G8B6KGfNZutJFcQM3UuCRiXYgBH/',
        thumbnailUri: 'https://ipfs.io/ipfs/QmV3yAjc2WXQNZycGq3G8B6KGfNZutJFcQM3UuCRiXYgBH/',
        featured: false,
        jsonFile: '0xcdb019c0990c033724da55f5a04be6fd6ec1809d.json'
    },
    {
        address: CONTRACTS.sparklesGenesis,
        name: 'Sparkles Genesis',
        symbol: 'SPARKLE',
        supply: 9999,
        description: 'Sparkles Genesis collection.',
        image: 'https://ipfs.io/ipfs/QmXe2RLWnagcD62nSxr45CwA9vPKVNoALwazY9UbiVNF6g/1.png',
        baseUri: 'https://ipfs.io/ipfs/QmXe2RLWnagcD62nSxr45CwA9vPKVNoALwazY9UbiVNF6g/',
        thumbnailUri: 'https://ipfs.io/ipfs/QmXe2RLWnagcD62nSxr45CwA9vPKVNoALwazY9UbiVNF6g/',
        featured: false,
        jsonFile: '0xd167c20575c284df75bcfe1794d54d3e057cd4ec.json'
    },
    {
        address: CONTRACTS.songbirdPunks,
        name: 'Songbird Punks',
        symbol: 'SBPUNK',
        supply: 20000,
        description: 'Punk-style NFTs on Songbird.',
        image: 'https://ipfs.io/ipfs/QmVEABGSJp2YSXYdULyJuiJLLbeSrexf2iY3zmZrecc5u8/1.png',
        baseUri: 'https://ipfs.io/ipfs/QmVEABGSJp2YSXYdULyJuiJLLbeSrexf2iY3zmZrecc5u8/',
        thumbnailUri: 'https://ipfs.io/ipfs/QmVEABGSJp2YSXYdULyJuiJLLbeSrexf2iY3zmZrecc5u8/',
        featured: false,
        jsonFile: '0xd83ae2c70916a2360e23683a0d3a3556b2c09935.json'
    },
    {
        address: CONTRACTS.doodcats,
        name: 'doodcats',
        symbol: 'DOODCAT',
        supply: 10000,
        description: 'Doodle cats on Songbird.',
        image: 'https://ipfs.io/ipfs/QmdjzdH9N5QYpBVRc3FoKo2z77piHHrzh6QstztVA8TfyE/1.png',
        baseUri: 'https://ipfs.io/ipfs/QmdjzdH9N5QYpBVRc3FoKo2z77piHHrzh6QstztVA8TfyE/',
        thumbnailUri: 'https://ipfs.io/ipfs/QmdjzdH9N5QYpBVRc3FoKo2z77piHHrzh6QstztVA8TfyE/',
        featured: false,
        jsonFile: '0x279a222a18c033124ab02290ddec97912a8b7185.json'
    },
    {
        address: CONTRACTS.bazookaChicks,
        name: 'Bazooka Chicks',
        symbol: 'BAZOOKA',
        supply: 10000,
        description: 'Bazooka Chicks on Songbird.',
        image: 'https://ipfs.io/ipfs/QmNSQh2m4aozJESozZnCj37szuiRvyab57Nkqd25HeGMHY/1.png',
        baseUri: 'https://ipfs.io/ipfs/QmNSQh2m4aozJESozZnCj37szuiRvyab57Nkqd25HeGMHY/',
        thumbnailUri: 'https://ipfs.io/ipfs/QmNSQh2m4aozJESozZnCj37szuiRvyab57Nkqd25HeGMHY/',
        featured: false,
        jsonFile: '0x2972ea6e6cc45c5837ce909def032dd325b48415.json'
    },
    {
        address: CONTRACTS.grumpyMonkeys,
        name: 'Grumpy Monkeys',
        symbol: 'GRUMPY',
        supply: 1000,
        description: 'Grumpy Monkeys on Songbird.',
        image: 'https://ipfs.io/ipfs/QmQQ1aSzdZaZ1KBR8dWJbnPN1BnFvr3ATtG2BcpeHvgND6/1.png',
        baseUri: 'https://ipfs.io/ipfs/QmQQ1aSzdZaZ1KBR8dWJbnPN1BnFvr3ATtG2BcpeHvgND6/',
        thumbnailUri: 'https://ipfs.io/ipfs/QmQQ1aSzdZaZ1KBR8dWJbnPN1BnFvr3ATtG2BcpeHvgND6/',
        featured: false,
        jsonFile: '0x972edff4d09a4fd8abde8e8f669b7e1e3b1f7e3d.json'
    },
    {
        address: CONTRACTS.cybrs,
        name: 'CYBRs',
        symbol: 'CYBR',
        supply: 20000,
        description: 'CYBRs on Songbird.',
        image: 'https://ipfs.io/ipfs/QmV6fgsPwsT3kbUPoHyeMrZ7Cx761pmMg82sKLgghAVeKy/1',
        baseUri: 'https://ipfs.io/ipfs/QmV6fgsPwsT3kbUPoHyeMrZ7Cx761pmMg82sKLgghAVeKy/',
        thumbnailUri: 'https://ipfs.io/ipfs/QmV6fgsPwsT3kbUPoHyeMrZ7Cx761pmMg82sKLgghAVeKy/',
        featured: false,
        jsonFile: '0x34ff649d709cccec77bcf433317176fd13246296.json'
    },
    {
        address: CONTRACTS.superBadBabies,
        name: 'Super Bad Babies',
        symbol: 'SBB',
        supply: 3333,
        description: 'Super Bad Babies on Songbird.',
        image: 'https://ipfs.io/ipfs/QmbkGuLePd9rgtyfzkV5iJnbKEYhkd4R6zcyQ9X9X6g12Q/1.png',
        baseUri: 'https://ipfs.io/ipfs/QmbkGuLePd9rgtyfzkV5iJnbKEYhkd4R6zcyQ9X9X6g12Q/',
        thumbnailUri: 'https://ipfs.io/ipfs/QmbkGuLePd9rgtyfzkV5iJnbKEYhkd4R6zcyQ9X9X6g12Q/',
        featured: false,
        jsonFile: '0x23a18a46c67301864f5b341e87f89b8ccb690c44.json'
    },
    {
        address: CONTRACTS.superBadGenesis,
        name: 'Super Bad Genesis Seed',
        symbol: 'SBGS',
        supply: 666,
        description: 'Super Bad Genesis Seed on Songbird.',
        image: 'https://ipfs.io/ipfs/QmPWDzHNbD6QghZ5ajRELFjKNQWSRh4G3qjfYjkgUPfqNX/1.png',
        baseUri: 'https://ipfs.io/ipfs/QmPWDzHNbD6QghZ5ajRELFjKNQWSRh4G3qjfYjkgUPfqNX/',
        thumbnailUri: 'https://ipfs.io/ipfs/QmPWDzHNbD6QghZ5ajRELFjKNQWSRh4G3qjfYjkgUPfqNX/',
        featured: false,
        jsonFile: '0xf4b4d366f9b4855690bb7530abc76c857b259093.json'
    },
    {
        address: CONTRACTS.innerCircle888,
        name: '888 Inner Circle',
        symbol: '888IC',
        supply: 4086,
        description: '888 Inner Circle - White Realm.',
        image: 'https://ipfs.io/ipfs/QmNiEd6pymnSambZraBWn5NCqGXUJwbUFxKHW1mhUX7Vxw/1',
        baseUri: 'https://ipfs.io/ipfs/QmNiEd6pymnSambZraBWn5NCqGXUJwbUFxKHW1mhUX7Vxw/',
        thumbnailUri: 'https://ipfs.io/ipfs/QmNiEd6pymnSambZraBWn5NCqGXUJwbUFxKHW1mhUX7Vxw/',
        featured: false,
        jsonFile: '0xff063937523c4514179a4d9a6769694baab357a8.json'
    },
    {
        address: CONTRACTS.theGrungies,
        name: 'The Grungies',
        symbol: 'GRUNGIE',
        supply: 1990,
        description: 'The Grungies on Songbird.',
        image: 'https://ipfs.io/ipfs/bafybeigl7q35qc5bqgcpwtjs6dpahquf4iloyd34taidrwhdkvgz2czzeu/1.png',
        baseUri: 'https://ipfs.io/ipfs/bafybeigl7q35qc5bqgcpwtjs6dpahquf4iloyd34taidrwhdkvgz2czzeu/',
        thumbnailUri: 'https://ipfs.io/ipfs/bafybeigl7q35qc5bqgcpwtjs6dpahquf4iloyd34taidrwhdkvgz2czzeu/',
        featured: false,
        jsonFile: '0x4f52a074de9f2651d2f711fee63fee9e3b439a7e.json'
    },
    {
        address: CONTRACTS.theSenators,
        name: 'The Senators',
        symbol: 'SENATOR',
        supply: 350,
        description: 'The Senators - Satraps Collection.',
        image: 'https://ipfs.io/ipfs/bafybeia3lq7i5jfprtohxiqtmy5olprhwchs4zih3vmerz5zueudjij5hu/1.png',
        baseUri: 'https://ipfs.io/ipfs/bafybeia3lq7i5jfprtohxiqtmy5olprhwchs4zih3vmerz5zueudjij5hu/',
        thumbnailUri: 'https://ipfs.io/ipfs/bafybeia3lq7i5jfprtohxiqtmy5olprhwchs4zih3vmerz5zueudjij5hu/',
        featured: false,
        jsonFile: '0x927463265ede6a52604d179d7110b7b2fc057a3f.json'
    },
    {
        address: CONTRACTS.fort,
        name: 'FORT',
        symbol: 'FORT',
        supply: 52,
        description: 'FORT collection on Songbird.',
        image: 'https://ipfs.io/ipfs/Qmbdb3opaLGKqJi1yD5uAohJMVmqSgArQvZVohEuW6YddB/1.json',
        baseUri: 'https://ipfs.io/ipfs/Qmbdb3opaLGKqJi1yD5uAohJMVmqSgArQvZVohEuW6YddB/',
        thumbnailUri: 'https://ipfs.io/ipfs/Qmbdb3opaLGKqJi1yD5uAohJMVmqSgArQvZVohEuW6YddB/',
        featured: false,
        jsonFile: '0x3157537399860305ebe9e7fd17cfa00aae291c82.json'
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
    'function dailyRewardAmount() view returns (uint256)',
    'event Staked(address indexed user, address indexed collection, uint256 tokenId)'
];

// Marketplace ABI
const MARKETPLACE_ABI = [
    'function list(address collection, uint256 tokenId, uint256 priceSGB, uint256 pricePOND)',
    'function unlist(address collection, uint256 tokenId)',
    'function updateListing(address collection, uint256 tokenId, uint256 newPriceSGB, uint256 newPricePOND)',
    'function buyWithSGB(address collection, uint256 tokenId) payable',
    'function buyWithPOND(address collection, uint256 tokenId)',
    'function makeOffer(address collection, uint256 tokenId, uint256 amountPOND, uint256 duration) payable',
    'function cancelOffer(address collection, uint256 tokenId, uint256 offerIndex)',
    'function acceptOffer(address collection, uint256 tokenId, uint256 offerIndex)',
    'function getListing(address collection, uint256 tokenId) view returns (address seller, uint256 priceSGB, uint256 pricePOND, bool active)',
    'function getOffers(address collection, uint256 tokenId) view returns (tuple(address buyer, uint256 amountSGB, uint256 amountPOND, uint256 expiry)[])',
    'function getStats() view returns (uint256 volumeSGB, uint256 volumePOND, uint256 sales)',
    'function getCollectionStats(address collection) view returns (uint256 volumeSGB, uint256 volumePOND, uint256 sales)',
    'function getActiveListings(address collection) view returns (uint256[])',
    'function getActiveListingCount(address collection) view returns (uint256)',
    'event Listed(address indexed collection, uint256 indexed tokenId, address indexed seller, uint256 priceSGB, uint256 pricePOND)',
    'event Unlisted(address indexed collection, uint256 indexed tokenId, address indexed seller)',
    'event Sold(address indexed collection, uint256 indexed tokenId, address seller, address indexed buyer, uint256 priceSGB, uint256 pricePOND)',
    'event OfferMade(address indexed collection, uint256 indexed tokenId, address indexed buyer, uint256 amountSGB, uint256 amountPOND, uint256 expiry)',
    'event OfferAccepted(address indexed collection, uint256 indexed tokenId, address seller, address indexed buyer, uint256 amountSGB, uint256 amountPOND)',
    'event OfferCancelled(address indexed collection, uint256 indexed tokenId, address indexed buyer)'
];
