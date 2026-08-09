/* eslint-disable */
import * as Router from 'expo-router';

export * from 'expo-router';

declare module 'expo-router' {
  export namespace ExpoRouter {
    export interface __routes<T extends string = string> extends Record<string, unknown> {
      StaticRoutes: `/` | `/(auth)` | `/(auth)/login` | `/(tabs)` | `/(tabs)/dashboard` | `/(tabs)/finance` | `/(tabs)/more` | `/(tabs)/players` | `/(tabs)/tournaments` | `/_sitemap` | `/dashboard` | `/finance` | `/login` | `/more` | `/players` | `/tournaments`;
      DynamicRoutes: never;
      DynamicRouteTemplate: never;
    }
  }
}
