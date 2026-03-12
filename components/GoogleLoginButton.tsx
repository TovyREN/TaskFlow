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
        // credentialResponse.credential is the JWT from Google
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
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

    if (!clientId) {
      console.error("GSI_ERROR: NEXT_PUBLIC_GOOGLE_CLIENT_ID is missing.");
      return;
    }

    if (window.google?.accounts?.id && containerRef.current) {
      try {
        // CRITICAL FIX: Use .initialize(), NOT .setup()
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: handleSuccess,
          auto_select: false,
          itp_support: true,
        });

        // Render the physical button into our ref
        window.google.accounts.id.renderButton(containerRef.current, {
          theme: "outline",
          size: "large",
          width: 280, // Fixed number avoids iframe rendering bugs
          text: "signin_with",
          shape: "rectangular",
          logo_alignment: "left",
        });
      } catch (error) {
        console.error("Error initializing Google Sign-In:", error);
      }
    }
  }, [handleSuccess]);

  // Initialize whenever the script loads OR if the window object is already there
  useEffect(() => {
    if (scriptLoaded || (typeof window !== "undefined" && window.google)) {
      initializeGoogle();
    }
  }, [scriptLoaded, initializeGoogle]);

  return (
    <div className="mt-4 w-full">
      {/* Load the Google Identity Services SDK */}
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
          <span className="px-2 bg-white text-gray-500 font-medium">or</span>
        </div>
      </div>

      <div 
        className={`flex justify-center min-h-[44px] transition-opacity ${
          disabled ? "opacity-50 pointer-events-none" : "opacity-100"
        }`}
      >
        {/* Google's library will inject the iframe here */}
        <div 
          ref={containerRef} 
          className="w-full flex justify-center"
          style={{ minHeight: '44px' }}
        />
      </div>
    </div>
  );
}