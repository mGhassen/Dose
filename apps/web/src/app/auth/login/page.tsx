import fs from "fs";
import path from "path";
import { LoginPageClient } from "./login-page-client";

function getLoginImages(): string[] {
  try {
    const publicDir = path.join(process.cwd(), "public");
    const files = fs.readdirSync(publicDir);
    return files
      .filter((name) => name.startsWith("login_"))
      .sort()
      .map((name) => `/${name}`);
  } catch {
    return [];
  }
}

export default function LoginPage() {
  const loginImages = getLoginImages();
  return <LoginPageClient loginImages={loginImages} />;
}
