import Link from "next/link";
import { SITE_NAME } from "@/lib/site-data";

export function SiteFooter() {
  return (
    <footer className="mt-auto w-full pt-12 pb-24 md:pb-8 border-t border-outline-variant bg-primary text-white">
      <div className="flex flex-col items-center gap-6 px-8 max-w-7xl mx-auto text-center">
        <div className="font-bold text-lg">{SITE_NAME}</div>
        <p className="text-white/70 text-sm max-w-md">
          Your one-stop destination for gaming, online government services (Seva),
          computer skill courses and cyber cafe facilities.
        </p>
        <div className="flex flex-wrap justify-center gap-6">
          <Link className="text-white/80 hover:text-white text-sm font-medium transition-colors" href="/gaming">
            Gaming House
          </Link>
          <Link className="text-white/80 hover:text-white text-sm font-medium transition-colors" href="/seva">
            Online Seva
          </Link>
          <Link className="text-white/80 hover:text-white text-sm font-medium transition-colors" href="/courses">
            Skill Courses
          </Link>
          <Link className="text-white/80 hover:text-white text-sm font-medium transition-colors" href="/admin/login">
            Admin
          </Link>
        </div>
        <p className="text-white/50 text-xs">
          © {new Date().getFullYear()} {SITE_NAME}. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
