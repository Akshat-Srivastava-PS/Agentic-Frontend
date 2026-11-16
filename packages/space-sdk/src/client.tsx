import React from "react";
import { QueryClient } from "@tanstack/react-query";

export const spaceQueryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60,
    },
  },
});

export function SafeAreaTopScrim({ backgroundColor }: { backgroundColor?: string }) {
  return (
    <div
      style={{
        height: "env(safe-area-inset-top, 0px)",
        backgroundColor: backgroundColor || "transparent",
      }}
    />
  );
}

export function createActionClient<T = any>() {
  return new Proxy({} as any, {
    get(_target, prop: string) {
      return async (args: any = {}) => {
        const response = await fetch("/actions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ action: prop, args }),
        });

        if (!response.ok) {
          const errText = await response.text();
          throw new Error(errText || `Action ${prop} failed with status ${response.status}`);
        }

        return response.json();
      };
    },
  }) as {
    [K in keyof T]: T[K] extends {
      request: { _output: infer TReq };
      response: { _output: infer TRes };
    }
      ? (args: TReq) => Promise<TRes>
      : (args: any) => Promise<any>;
  };
}

export type ApiRequest<TClient, TAction extends keyof TClient> =
  TClient[TAction] extends (args: infer TArgs) => any ? TArgs : never;

export type ApiResponse<TClient, TAction extends keyof TClient> =
  TClient[TAction] extends (args: any) => Promise<infer TRes> ? TRes : never;
