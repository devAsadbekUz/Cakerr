import styles from './HeroBanner.module.css';

export default function HeroBanner() {
    return (
        <div className={styles.banner}>
            <div className={styles.content}>
                <span className={styles.badge}>🎉 Yangi mahsulotlar</span>
                <h2 className={styles.title}>30% chegirma barcha tortlarga</h2>
                <button className={styles.button}>Buyurtma berish</button>
            </div>
            <div className={styles.decoration}></div>
        </div>
    );
}
