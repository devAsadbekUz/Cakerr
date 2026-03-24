import styles from './loading.module.css';

export default function ClientLoading() {
    return (
        <div className={styles.container}>
            <div className={styles.spinner} />
            <p className={styles.text}>Yuklanmoqda...</p>
        </div>
    );
}
