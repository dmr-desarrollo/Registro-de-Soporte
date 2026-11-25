
"use client";

import { useEffect, useState, useRef } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import type { User as FirebaseUser } from "firebase/auth";
import { useRouter } from "next/navigation";
import { MainNav } from "@/components/main-nav";
import { UserNav } from "@/components/user-nav";
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarTrigger,
  SidebarInset,
} from "@/components/ui/sidebar";
import { Icons } from "@/components/icons";
import { getUserByEmail } from "@/lib/firestore";
import type { User } from "@/lib/types";
import Image from "next/image";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [appUser, setAppUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const hasFetchedUser = useRef(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      async (currentUser) => {
        try {
          if (!currentUser || !currentUser.email) {
            router.push("/");
          } else {
            setUser(currentUser);
            // Only fetch app user if the fetch hasn't been attempted yet.
            if (!hasFetchedUser.current) {
              hasFetchedUser.current = true; // Set flag immediately
              const profile = await getUserByEmail(currentUser.email);
              setAppUser(profile);
            }
          }
        } catch (error) {
          console.error("Error handling auth state change in dashboard layout:", error);
        } finally {
          setIsLoading(false);
        }
      },
      (error) => {
        console.error("Firebase auth state observer error:", error);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); 

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Icons.spinner className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return null; // or a redirect component
  }

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader className="p-4">
            <div className="flex items-center gap-2">
                <Icons.logo className="w-8 h-8 text-primary" />
                <h1 className="text-xl font-semibold">Soporte Técnico</h1>
            </div>
        </SidebarHeader>
        <SidebarContent>
          <MainNav userRole={appUser?.role} />
        </SidebarContent>
      </Sidebar>
      <SidebarInset>
        <div className="flex flex-col min-h-screen">
            <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
            <SidebarTrigger className="sm:hidden" />
            <div className="ml-auto flex items-center gap-2">
                <UserNav user={user} />
            </div>
            </header>
            <main className="flex-1 p-4 sm:px-6 sm:py-0">{children}</main>
            <footer className="mt-auto p-4 text-center text-sm text-muted-foreground flex flex-col items-center gap-2">
                 <Image 
                    src="https://firebasestorage.googleapis.com/v0/b/tech-support-tracker.firebasestorage.app/o/logo_dmr_transparente.png?alt=media&token=a529839f-5e58-438d-aaa1-3c36ecbf401e"
                    alt="Logo DMR"
                    width={80}
                    height={40}
                 />
                <div>
                    Software desarrollado por DMR -{' '}
                    <a 
                        href="https://dmr.com.uy" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="underline hover:text-primary"
                    >
                        Dmr.com.uy
                    </a>
                </div>
            </footer>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
