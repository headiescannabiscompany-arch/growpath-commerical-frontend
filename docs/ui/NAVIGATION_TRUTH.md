# Navigation Truth (Authoritative)

Decision:
- Authoritative UI navigation = Expo Router under `src/app/**`.

Evidence:
- Expo Router entry is present in `src/app/_layout.tsx`.
- `src/app/**` routes import legacy screens in several places (bridges still exist):
  - `src/app/vendor-signup.tsx` imports `@/screens/VendorSignup`
  - `src/app/live-session.tsx` imports `@/screens/LiveSessionScreen`
  - `src/app/create-post.tsx` imports `@/screens/CreatePostScreen`
  - `src/app/debug.tsx` imports `@/screens/DebugScreen`
  - `src/app/home/personal/more/*` imports multiple `@/screens/*`
  - `src/app/home/personal/(tabs)/forum.tsx` imports `@/screens/ForumScreen`
  - `src/app/home/personal/(tabs)/diagnose.tsx` imports `@/screens/DiagnoseScreen`
  - `src/app/home/personal/(tabs)/courses.tsx` imports `@/screens/CoursesScreen`

Legacy status:
- Legacy screens are still wired through Expo Router bridge routes.
- Action: keep `src/screens/**` as legacy for now, but treat `src/app/**` as the only entrypoint for new work.

Commands used:
- `rg -n "src/screens" src`
- `rg -n "@/screens" src`
