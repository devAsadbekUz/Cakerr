'use client';

import { AdminCartProvider } from "@/app/context/AdminCartContext";
import { CustomCakeProvider } from "@/app/context/CustomCakeContext";

export default function PosLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <AdminCartProvider>
            <CustomCakeProvider>
                {children}
            </CustomCakeProvider>
        </AdminCartProvider>
    );
}
