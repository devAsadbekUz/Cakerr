import { CustomCakeProvider } from '@/app/context/CustomCakeContext';
import WizardShell from '@/app/components/yaratish/WizardShell';

export default function YaratishPage() {
    return (
        <CustomCakeProvider>
            <WizardShell />
        </CustomCakeProvider>
    );
}
