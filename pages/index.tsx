import Link from "next/link";
import styles from "../styles/Home.module.css";

export default function Home() {
  return (
    <div className={styles.container}>
      <main className={styles.main}>
        <p>TODO: Add some light metrics about Solano</p>
        <p>Examples:</p>
        <ul>
          <li>
            <Link href="/tx/3KktLw5mbmiVW7733zpAy5sVZg8EA6oDZ6nRWSWSPqDh3zDr7tzuCT6gxHj9vDh2jJHdXtMnex2sstnwdh1xvGFA">
              Jupiter V4 2 splits of 2 swaps tx, 58 accounts involved
            </Link>
          </li>
          <li>
            <Link href="/tx/2k9ruymuLBwtHh4deW7GufU2WTuB2G6kZpvEUyfVaYsV16dmDTFA1X6WJAW7LjWMiZPcz7JPmsscmGsHKXJzAcJo">
              Jupiter V4 Meteora x Meteora swap, 3 levels of CPI
            </Link>
          </li>
          <li>more txs...</li>
        </ul>
      </main>

      <footer className={styles.footer}></footer>
    </div>
  );
}
