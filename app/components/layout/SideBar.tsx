
// "use client";

// import Link from "next/link";
// import { usePathname } from "next/navigation";

// const navigation = [
//     { label: "Beranda", href: "/beranda", icon: "⌂" },
//     { label: "Catatan Pekerjaan", href: "/catatan-pekerjaan", icon: "▤" },
//     { label: "Jadwal Tim", href: "/jadwal-tim", icon: "▦" },
// ];

// export default function SideBar() {
//     const pathname = usePathname();

//     return (
//         <aside className="sidebar">
//             <Link href="/beranda" className="brand">
//                 <div className="brand-logo">J</div>
//                 <div>
//                     <strong>JagoFarm</strong>
//                     <span>TaskFlow</span>
//                 </div>
//             </Link>

//             <nav className="sidebar-nav">
//                 {navigation.map((item) => {
//                     const active =
//                         pathname === item.href ||
//                         pathname.startsWith(`${item.href}/`);

//                     return (
//                         <Link
//                             key={item.href}
//                             href={item.href}
//                             className={`nav-link ${active ? "active" : ""}`}
//                         >
//                             <span className="nav-icon">{item.icon}</span>
//                             <span>{item.label}</span>
//                         </Link>
//                     );
//                 })}
//             </nav>

//             <div className="sidebar-footer">
//                 <div className="team-avatar">JF</div>
//                 <div>
//                     <strong>Tim JagoFarm</strong>
//                     <span>4 anggota</span>
//                 </div>
//             </div>
//         </aside>
//     );
// }
