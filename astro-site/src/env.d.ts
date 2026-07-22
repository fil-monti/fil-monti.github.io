/// <reference types="astro/client" />

type CgsiDeck = {
  next: () => void;
  prev: () => void;
  slide: (horizontal: number, vertical?: number) => void;
};

interface Window {
  cgsiDeck?: CgsiDeck;
}
