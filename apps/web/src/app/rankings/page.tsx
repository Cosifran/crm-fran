import { RankingsView } from "@/features/rankings/rankings-view";

import styles from "./rankings.module.css";

export default function RankingsPage() {
  return (
    <main className={`${styles.theme} mx-auto flex w-full min-w-0 flex-col gap-6 px-4 pt-6 sm:px-6`}>
      <header className="flex flex-col gap-2">
        <h1 className={styles.heading}>Rankings</h1>
        <p className={styles.subtitle}>
          Compite por resultados reales, suma puntos para la liga y construye tu palmarés mensual.
        </p>
      </header>
      <RankingsView />
    </main>
  );
}
