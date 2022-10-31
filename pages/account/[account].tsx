import { Connection, PublicKey } from "@solana/web3.js";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/router";
import styles from "../../styles/Home.module.css";

const connection = new Connection("https://api.mainnet-beta.solana.com");
const options: Intl.DateTimeFormatOptions = {
  year: "numeric",
  month: "numeric",
  day: "numeric",
  hour: "numeric",
  minute: "numeric",
  second: "numeric",
};

// If we have our own node we can toggle some fancy feature like tx streaming
export default function Account() {
  const router = useRouter();
  const account = router.query.account as string;
  const { data: confirmedSignatureInfos } = useQuery(
    ["account", account],
    async () => {
      const address = new PublicKey(account);
      const confirmedSignatureInfos = await connection.getSignaturesForAddress(
        address,
        {
          limit: 20,
        }
      );
      return confirmedSignatureInfos;
    },
    { refetchInterval: false }
  );

  return (
    <div className={styles.container}>
      <main className={styles.main}>
        TODO: Add account specific decoding / IDL account decoding
        <ul>
          {confirmedSignatureInfos?.map((confirmedSignatureInfo) => {
            return (
              <li key={confirmedSignatureInfo.signature}>
                <Link href={`/tx/${confirmedSignatureInfo.signature}`}>
                  <p>
                    {new Date(
                      (confirmedSignatureInfo.blockTime ?? 0) * 1000
                    ).toLocaleDateString("en-US", options)}{" "}
                    {confirmedSignatureInfo.err ? "Err" : "Success"}{" "}
                    {confirmedSignatureInfo.signature}
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
      </main>

      <footer className={styles.footer}></footer>
    </div>
  );
}
