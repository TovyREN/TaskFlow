"use client";

import React, { useEffect, useCallback, useRef, useState } from "react";
import Script from "next/script";
import { loginWithGoogle } from "@/app/actions/authActions";
import { User } from "@/types";

interface GoogleLoginButtonProps {
  onLogin: (user: User) => void;
  onError?: (error: string) => void;
  disabled?: boolean;
}

declare global {
  interface Window {
    google?: any;
  }
}

export default function GoogleLoginButton({
  onLogin,
  onError,
  disabled = false,
}: GoogleLoginButtonProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scriptLoaded, setScriptLoaded] = useState(false);

  const handleSuccess = useCallback(
    async (credentialResponse: any) => {
      try {
        const result = await loginWithGoogle(credentialResponse.credential);

        if (result.success && result.user) {
          onLogin(result.user);
        } else {
          onError?.(result.error || "Google login failed");
        }
      } catch (error) {
        console.error("Google login error:", error);
        onError?.("An error occurred during Google login");
      }
    },
    [onLogin, onError]
  );

  const initializeGoogle = useCallback(() => {
    // Only proceed if script is loaded, container exists, and Client ID is available
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    
    if (!clientId) {
      console.error("Google Client ID is missing from environment variables.");
      return;
    }

    if (window.google?.accounts?.id && containerRef.current) {
      try {
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: handleSuccess,
          auto_select: false,
          itp_support: true,
        });

        window.google.accounts.id.renderButton(containerRef.current, {
          theme: "outline",
          size: "large",
          // Use a fixed number or valid string for width
          // "100%" often causes the button to fail to render in certain containers
          width: 300, 
          text: "signin_with",
          shape: "rectangular",
          logo_alignment: "left",
        });
      } catch (error) {
        console.error("Error initializing Google Sign-In:", error);
      }
    }
  }, [handleSuccess]);

  useEffect(() => {
    // Re-initialize if the script is loaded OR if the window.google object becomes available
    if (scriptLoaded || (typeof window !== "undefined" && window.google)) {
      initializeGoogle();
    }
  }, [scriptLoaded, initializeGoogle]);

  return (
    <div className="mt-4 w-full">
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
        onLoad={() => setScriptLoaded(true)}
        onError={() => onError?.("Failed to load Google SDK")}
      />

      <div className="relative mb-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-300"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-white text-gray-500">or</span>
        </div>
      </div>

      <div 
        className={`flex justify-center min-h-[44px] ${disabled ? "opacity-50 pointer-events-none" : ""}`}
      >
        <div 
          ref={containerRef} 
          id="google-button-container" 
          className="w-full flex justify-center"
        />
      </div>
      
      {/* Hidden fallback/loading text if the button fails to render within 5 seconds */}
      <noscript>
        <p className="text-center text-xs text-red-500">
          Javascript is required for Google Sign-In.
        </p>
      </noscript>
    </div>
  );
}