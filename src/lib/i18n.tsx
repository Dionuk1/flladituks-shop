import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Lang = "sq" | "en";
const KEY = "flladituks_lang";

const dict = {
  sq: {
    "nav.search": "Kërko produkte...",
    "nav.cart": "Shporta",
    "hero.title": "Bli më lehtë. Pranoje më shpejt.",
    "hero.sub":
      "FlladituKS — produktet që duash, me dërgesë në të gjithë Kosovën dhe pagesë në dorë.",
    "hero.fast": "Dorëzim i shpejtë",
    "hero.cod": "Pagesa në dorë",
    "hero.quality": "Cilësi e garantuar",
    "filters.deals": "Me Zbritje",
    "filters.hideSold": "Fshih produktet e shitura",
    "filters.search": "Kërko produkt...",
    "filters.category": "Kategoria",
    "filters.allCategories": "Të gjitha kategoritë",
    "filters.maxPrice": "Çmimi max (€)",
    "empty.title": "Asnjë produkt nuk u gjet",
    "empty.sub": "Provo të ndryshosh filtrat ose kthehu më vonë.",
    "product.add": "Shto",
    "product.noStock": "Nuk ka stok",
    "product.sold": "E shitur",
    "product.inStock": "në stok",
    "product.unavailable": "I padisponueshëm",
    "cart.empty": "Shporta është bosh",
    "cart.total": "Totali",
    "cart.checkout": "Porosit tani",
    "cart.finish": "Përfundo porosinë",
    "checkout.back": "Kthehu te shporta",
    "checkout.name": "Emri dhe Mbiemri *",
    "checkout.phone": "Numri i Telefonit *",
    "checkout.city": "Qyteti *",
    "checkout.address": "Adresa e Dorëzimit *",
    "checkout.notes": "Shënime (opsionale)",
    "checkout.payment": "Mënyra e pagesës",
    "checkout.cod": "Pagesë në Dorëzim",
    "checkout.codSub": "Paguaj kur ta pranosh porosinë",
    "checkout.subtotal": "Nëntotali",
    "checkout.shipping": "Transporti",
    "checkout.free": "Falas",
    "checkout.totalPay": "Totali për pagesë",
    "checkout.confirm": "Konfirmo porosinë",
    "success.title": "Porosia u konfirmua!",
    "success.sub": "Faleminderit — do të kontaktohesh së shpejti.",
    "footer.tagline": "Freski në çdo porosi — dyqani yt online në Kosovë.",
    "footer.links": "Lidhje të shpejta",
    "footer.support": "Përkrahja e klientit",
    "footer.home": "Ballina",
    "footer.deals": "Ofertat",
    "footer.orders": "Statusi i porosisë",
    "footer.trustDelivery": "Dërgesë e shpejtë 24-48h",
    "footer.trustCod": "Pagesa e garantuar në dorëzim",
    "footer.rights": "Të gjitha të drejtat e rezervuara.",
    "cookies.text": "Përdorim cookies për të përmirësuar përvojën tuaj.",
    "cookies.accept": "Prano",
    "cookies.settings": "Cilësimet",
    "cookies.necessary": "Të domosdoshme (gjithmonë aktive)",
    "cookies.analytics": "Analitika",
    "cookies.marketing": "Marketing",
    "cookies.save": "Ruaj cilësimet",
  },
  en: {
    "nav.search": "Search products...",
    "nav.cart": "Cart",
    "hero.title": "Shop easier. Get it faster.",
    "hero.sub":
      "FlladituKS — the products you want, delivered across Kosovo with cash on delivery.",
    "hero.fast": "Fast delivery",
    "hero.cod": "Cash on delivery",
    "hero.quality": "Guaranteed quality",
    "filters.deals": "On Sale",
    "filters.hideSold": "Hide sold products",
    "filters.search": "Search product...",
    "filters.category": "Category",
    "filters.allCategories": "All categories",
    "filters.maxPrice": "Max price (€)",
    "empty.title": "No products found",
    "empty.sub": "Try changing the filters or come back later.",
    "product.add": "Add",
    "product.noStock": "Out of stock",
    "product.sold": "Sold",
    "product.inStock": "in stock",
    "product.unavailable": "Unavailable",
    "cart.empty": "Your cart is empty",
    "cart.total": "Total",
    "cart.checkout": "Order now",
    "cart.finish": "Complete your order",
    "checkout.back": "Back to cart",
    "checkout.name": "Full name *",
    "checkout.phone": "Phone number *",
    "checkout.city": "City *",
    "checkout.address": "Delivery address *",
    "checkout.notes": "Notes (optional)",
    "checkout.payment": "Payment method",
    "checkout.cod": "Cash on Delivery",
    "checkout.codSub": "Pay when you receive the order",
    "checkout.subtotal": "Subtotal",
    "checkout.shipping": "Shipping",
    "checkout.free": "Free",
    "checkout.totalPay": "Total to pay",
    "checkout.confirm": "Confirm order",
    "success.title": "Order confirmed!",
    "success.sub": "Thank you — we will contact you shortly.",
    "footer.tagline": "A breeze with every order — your online store in Kosovo.",
    "footer.links": "Quick links",
    "footer.support": "Customer support",
    "footer.home": "Home",
    "footer.deals": "Deals",
    "footer.orders": "Order status",
    "footer.trustDelivery": "Fast delivery 24-48h",
    "footer.trustCod": "Guaranteed COD payment",
    "footer.rights": "All rights reserved.",
    "cookies.text": "We use cookies to improve your experience.",
    "cookies.accept": "Accept",
    "cookies.settings": "Settings",
    "cookies.necessary": "Necessary (always on)",
    "cookies.analytics": "Analytics",
    "cookies.marketing": "Marketing",
    "cookies.save": "Save settings",
  },
} as const;

export type TKey = keyof (typeof dict)["sq"];

const Ctx = createContext<{ lang: Lang; setLang: (l: Lang) => void; t: (k: TKey) => string }>({
  lang: "sq",
  setLang: () => {},
  t: (k) => dict.sq[k],
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("sq");

  useEffect(() => {
    const stored = localStorage.getItem(KEY) as Lang | null;
    if (stored === "sq" || stored === "en") setLangState(stored);
  }, []);

  const setLang = (l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem(KEY, l);
    } catch {
      /* ignore */
    }
  };

  return (
    <Ctx.Provider value={{ lang, setLang, t: (k) => dict[lang][k] ?? dict.sq[k] }}>
      {children}
    </Ctx.Provider>
  );
}

export const useI18n = () => useContext(Ctx);
