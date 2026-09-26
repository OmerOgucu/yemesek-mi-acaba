import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

type Selection = {
  restaurantId: string | null;
  setRestaurantId: (id: string) => void;
};

const SelectionContext = createContext<Selection | null>(null);

export function SelectionProvider({ children }: { children: ReactNode }) {
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const value = useMemo(() => ({ restaurantId, setRestaurantId }), [restaurantId]);
  return <SelectionContext.Provider value={value}>{children}</SelectionContext.Provider>;
}

export function useSelection(): Selection {
  const value = useContext(SelectionContext);
  if (!value) throw new Error('SelectionProvider eksik.');
  return value;
}
