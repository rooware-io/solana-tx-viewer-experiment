# A solana transaction viewer

A experiment at making an explorer with reasonable information density, surfacing the essentials by default while allowing deep dive
Inspired by https://github.com/samczsun/ethereum-transaction-viewer-frontend

Area of work:
- Almost all transactions contain token transfers, put particular care on displaying that data specifically
- Do i really need to see all accounts at all times, account metas and other details? Hide by default what is only necessary for a deep debugging session
- Parse with decoders and IDLs but that doesn't make it the final ingestable output, give a high level extract
- Try to reduce repetitions and instead make the layout speak for itself

Pages of focus for now
- Account with related transactions
- Transaction

Once this comes to mainnet validators remove the hack used to rebuild stack_height https://github.com/solana-labs/solana/pull/28430

https://explorer.solana.com/tx/3KktLw5mbmiVW7733zpAy5sVZg8EA6oDZ6nRWSWSPqDh3zDr7tzuCT6gxHj9vDh2jJHdXtMnex2sstnwdh1xvGFA


```
curl 'https://api.mainnet-beta.solana.com/' \
  -H 'content-type: application/json' \
  --data-raw '{"method":"getTransaction","jsonrpc":"2.0","params":["3KktLw5mbmiVW7733zpAy5sVZg8EA6oDZ6nRWSWSPqDh3zDr7tzuCT6gxHj9vDh2jJHdXtMnex2sstnwdh1xvGFA",{"encoding":null,"commitment":"confirmed","maxSupportedTransactionVersion":0}]}'
```

To compare with etherscan or samczun's viewer

https://etherscan.io/tx/0x9ef7a35012286fef17da12624aa124ebc785d9e7621e1fd538550d1209eb9f7d

https://tx.eth.samczsun.com/ethereum/0x9ef7a35012286fef17da12624aa124ebc785d9e7621e1fd538550d1209eb9f7d

Other solana Txs:

depth of 3 for CPI https://solscan.io/tx/2k9ruymuLBwtHh4deW7GufU2WTuB2G6kZpvEUyfVaYsV16dmDTFA1X6WJAW7LjWMiZPcz7JPmsscmGsHKXJzAcJo

