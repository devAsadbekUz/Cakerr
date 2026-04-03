// Telegram Web App SDK TypeScript Definitions
// https://core.telegram.org/bots/webapps

interface TelegramWebAppUser {
    id: number;
    first_name: string;
    last_name?: string;
    username?: string;
    language_code?: string;
    photo_url?: string;
    is_premium?: boolean;
}

interface TelegramContact {
    phone_number: string;
    first_name: string;
    last_name?: string;
    user_id: number;
}

interface TelegramWebAppInitData {
    user?: TelegramWebAppUser;
    auth_date: number;
    hash: string;
    query_id?: string;
    start_param?: string;
}

interface TelegramMainButton {
    text: string;
    color: string;
    textColor: string;
    isVisible: boolean;
    isActive: boolean;
    isProgressVisible: boolean;
    setText: (text: string) => void;
    show: () => void;
    hide: () => void;
    enable: () => void;
    disable: () => void;
    showProgress: (leaveActive?: boolean) => void;
    hideProgress: () => void;
    onClick: (callback: () => void) => void;
    offClick: (callback: () => void) => void;
}

interface TelegramBackButton {
    isVisible: boolean;
    show: () => void;
    hide: () => void;
    onClick: (callback: () => void) => void;
    offClick: (callback: () => void) => void;
}

interface TelegramWebApp {
    initData: string;
    initDataUnsafe: TelegramWebAppInitData;
    version: string;
    platform: string;
    colorScheme: 'light' | 'dark';
    themeParams: {
        bg_color?: string;
        text_color?: string;
        hint_color?: string;
        link_color?: string;
        button_color?: string;
        button_text_color?: string;
    };
    isExpanded: boolean;
    viewportHeight: number;
    viewportStableHeight: number;
    headerColor: string;
    backgroundColor: string;

    // Methods
    ready: () => void;
    expand: () => void;
    close: () => void;

    // Contact request - the key method for getting phone numbers
    requestContact: (callback: (sent: boolean, event?: {
        responseUnsafe: { contact: TelegramContact }
    }) => void) => void;

    // UI Components
    MainButton: TelegramMainButton;
    BackButton: TelegramBackButton;

    // Haptic feedback
    HapticFeedback: {
        impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
        notificationOccurred: (type: 'error' | 'success' | 'warning') => void;
        selectionChanged: () => void;
    };

    // Events
    onEvent: (eventType: string, callback: () => void) => void;
    offEvent: (eventType: string, callback: () => void) => void;

    // Data sending
    sendData: (data: string) => void;

    // Popups
    showPopup: (params: {
        title?: string;
        message: string;
        buttons?: Array<{
            id?: string;
            type?: 'default' | 'ok' | 'close' | 'cancel' | 'destructive';
            text?: string;
        }>;
    }, callback?: (buttonId: string) => void) => void;

    showAlert: (message: string, callback?: () => void) => void;
    showConfirm: (message: string, callback?: (confirmed: boolean) => void) => void;

    // Link opening
    openLink: (url: string, options?: { try_instant_view?: boolean }) => void;
    openTelegramLink: (url: string) => void;

    // Vertical Swipes control (Mini App 7.7+)
    disableVerticalSwipes?: () => void;
    enableVerticalSwipes?: () => void;
}

declare global {
    interface Window {
        Telegram?: {
            WebApp: TelegramWebApp;
        };
    }
}

export type {
    TelegramWebApp,
    TelegramWebAppUser,
    TelegramContact,
    TelegramWebAppInitData,
    TelegramMainButton,
    TelegramBackButton
};
