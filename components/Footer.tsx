const FOOTER_COLUMNS: { title: string; links: string[] }[] = [
  {
    title: "Get to Know Us",
    links: ["Careers", "Blog", "About Amazon", "Investor Relations", "Amazon Science"],
  },
  {
    title: "Make Money with Us",
    links: ["Sell products on Amazon", "Sell on Amazon Business", "Become an Affiliate", "Advertise Your Products"],
  },
  {
    title: "Payment Products",
    links: ["Your Business Account", "Shop with Points", "Reload Your Balance"],
  },
  {
    title: "Let Us Help You",
    links: ["Amazon and COVID-19", "Your Account", "Your Orders", "Shipping Rates & Policies", "Help"],
  },
];

export function Footer() {
  return (
    <footer className="mt-auto">
      <a
        href="#top"
        className="block w-full text-center text-[13px] py-3 text-white bg-navbar-2 hover:bg-[#3a4453]"
      >
        Back to top
      </a>

      <div className="bg-[#232f3e] text-[#dddddd] text-[13px]">
        <div className="max-w-6xl mx-auto px-6 py-10 grid grid-cols-2 sm:grid-cols-4 gap-8">
          {FOOTER_COLUMNS.map((col) => (
            <div key={col.title}>
              <h3 className="text-white font-bold mb-2">{col.title}</h3>
              <ul className="space-y-1.5">
                {col.links.map((link) => (
                  <li key={link}>
                    <span className="cursor-pointer hover:underline">{link}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-[#3a4553]">
          <div className="max-w-6xl mx-auto px-6 py-4 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs">
            <span>Amazon.com clone</span>
            <span>•</span>
            <span>US context demo (non-commercial)</span>
            <span>•</span>
            <span>For an 8x assignment</span>
          </div>
        </div>
      </div>
    </footer>
  );
}