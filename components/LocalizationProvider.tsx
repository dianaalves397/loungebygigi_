"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

type Country = {
  code: string;
  name: string;
  language: string;
  currency: string;
  symbol: string;
  rate: number;
};

const fallbackCountries: Country[] = [
  { code: "PT", name: "Portugal", language: "pt", currency: "EUR", symbol: "€", rate: 1 }
];

const LocalizationContext = createContext({
  country: fallbackCountries[0],
  countries: fallbackCountries,
  setCountryCode: (_code: string) => {}
});

export function useLocalization() {
  return useContext(LocalizationContext);
}

export function LocalizationProvider({ settings, children }: { settings: any; children: React.ReactNode }) {
  const countries: Country[] = settings?.localization?.countries || fallbackCountries;
  const defaultCode = settings?.localization?.defaultCountry || "PT";
  const [countryCode, setCountryCodeState] = useState(defaultCode);
  const [showPicker, setShowPicker] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("lounge_country");
    if (saved) setCountryCodeState(saved);
    else setShowPicker(true);
  }, []);

  const country = useMemo(() => {
    return countries.find((item) => item.code === countryCode) || countries[0] || fallbackCountries[0];
  }, [countries, countryCode]);

  function setCountryCode(code: string) {
    setCountryCodeState(code);
    localStorage.setItem("lounge_country", code);
    setShowPicker(false);
  }

  return (
    <LocalizationContext.Provider value={{ country, countries, setCountryCode }}>
      {children}

      {showPicker && (
        <div className="country-modal-backdrop">
          <div className="country-modal">
            <p className="eyebrow">welcome to lounge</p>
            <h2>Escolhe o teu país</h2>
            <p className="muted">A língua e a moeda são ajustadas conforme o país escolhido.</p>
            <div className="country-grid">
              {countries.map((item) => (
                <button key={item.code} onClick={() => setCountryCode(item.code)}>
                  <strong>{item.name}</strong>
                  <span>{item.language.toUpperCase()} · {item.currency}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </LocalizationContext.Provider>
  );
}

export function CountrySwitcher() {
  const { country, countries, setCountryCode } = useLocalization();

  return (
    <select
      className="country-switcher"
      value={country.code}
      onChange={(event) => setCountryCode(event.target.value)}
      aria-label="Selecionar país"
    >
      {countries.map((item) => (
        <option key={item.code} value={item.code}>
          {item.code} · {item.currency}
        </option>
      ))}
    </select>
  );
}

