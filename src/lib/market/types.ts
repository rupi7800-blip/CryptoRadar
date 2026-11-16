export type Coin = {
  id: string; // id nella fonte (CoinGecko o CoinPaprika)
  idSource: 'coingecko' | 'coinpaprika' | 'coinmarketcap';
  symbol: string;
  name: string;
  image: string | null;
  rank: number | null;
  price: number | null;
  marketCap: number | null;
  volume24h: number | null;
  ch1h: number | null;
  ch24h: number | null;
  ch7d: number | null;
  circulating: number | null;
  maxSupply: number | null;
  ath: number | null;
  athDate: string | null;
  atl: number | null;
  atlDate: string | null;
  sparkline?: number[] | null;
  lastUpdated: string | null;
};

export type GlobalMarket = {
  totalMarketCap: number | null;
  totalVolume: number | null;
  btcDominance: number | null;
  ethDominance: number | null;
  marketCapChange24h: number | null;
  activeCryptos: number | null;
};
