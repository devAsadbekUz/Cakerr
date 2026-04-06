import { cookies } from 'next/headers';
import { clientTranslations, type Language } from './client-translations';

export async function getServerLang(): Promise<Language> {
    const cookieStore = await cookies();
    const lang = cookieStore.get('client-lang')?.value as Language;
    return lang === 'uz' || lang === 'ru' ? lang : 'uz';
}

/** Returns a t() function bound to the request's language, for use in Server Components. */
export async function getServerT(): Promise<(key: string) => any> {
    const lang = await getServerLang();
    return (key: string) => clientTranslations[lang]?.[key] ?? key;
}
