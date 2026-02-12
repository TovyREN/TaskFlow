"use client";

import React, { useEffect, useCallback, useRef } from "react";
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

  const handleError = useCallback(() => {
    onError?.("Google login failed");
  }, [onError]);

  useEffect(() => {
    if (typeof window !== "undefined" && window.google) {
      try {
        window.google.accounts.id.renderButton(containerRef.current, {
          theme: "outline",
          size: "large",
          width: "100%",
        });

        window.google.accounts.id.setup({
          client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
          callback: handleSuccess,
        });
      } catch (error) {
        console.error("Error initializing Google Sign-In:", error);
      }
    }
  }, [handleSuccess]);

  return (
    <div className="mt-4">
      <div className="relative mb-4">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-300"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-white text-gray-500">or</span>
        </div>
      </div>
      <div className={disabled ? "opacity-50 pointer-events-none" : ""}>
        <div ref={containerRef} className="flex justify-center" />
      </div>
    </div>
  );
}
