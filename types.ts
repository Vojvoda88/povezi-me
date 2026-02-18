export enum AdStatus {
  NA_CEKANJU = 'NA_CEKANJU',
  AKTIVAN = 'AKTIVAN',
  PRODAN = 'PRODAN',
  ISTEKAO = 'ISTEKAO'
}

export type PromotionStatus = "none" | "pending_payment" | "active" | "expired";
export type PromotionPlan = "7d" | "14d" | "30d" | null;

export enum FuelType {
  BENZIN = 'Benzin',
  DIZEL = 'Dizel',
  TNG = 'TNG (Plin)',
  HIBRID = 'Hibrid',
  ELEKTRICNI = 'Električni'
}

export enum TransmissionType {
  MANUELNI = 'Manuelni',
  AUTOMATSKI = 'Automatstki'
}

export enum DriveType {
  PREDNJI = 'Prednji',
  ZADNJI = 'Zadnji',
  SVA_CETIRI = '4x4 (Sva četiri)'
}

export enum BodyType {
  LIMUZINA = 'Limuzina',
  KARAVAN = 'Karavan',
  SUV = 'SUV',
  HECBEK = 'Hečbek',
  KUPE = 'Kupe',
  KABRIOLET = 'Kabriolet'
}

export enum MotorcycleType {
  SCOOTER = 'Skuter',
  NAKED = 'Naked',
  SPORT = 'Sport',
  TOURING = 'Touring',
  ENDURO = 'Enduro / Cross',
  CHOPPER = 'Chopper / Cruiser',
  ATV = 'ATV / Quad'
}

export interface CarDetails {
  marka: string;
  model: string;
  godiste: number;
  kilometraza: number;
  gorivo: FuelType;
  snaga: number; 
  kubikaza: number;
  mjenjac: TransmissionType;
  pogon: DriveType;
  karoserija: BodyType;
  brojVrata?: string;
  boja?: string;
  registrovanDo?: string;
  stanje: string; // Novo, Polovno, Oštećeno
}

export interface MotorcycleDetails {
  marka: string;
  model: string;
  godiste: number;
  kilometraza: number;
  kubikaza: number;
  gorivo: FuelType;
  mjenjac: TransmissionType;
  tip: MotorcycleType;
  boja?: string;
  snagaKW: number;
  registrovanDo?: string;
  stanje: string; // Novo, Polovno, Oštećeno
}

export type TipOglasa = 'prodajem' | 'trazim';
export interface RealEstateDetails {
  tipNekretnine?: string; // stan | kuca | plac | poslovni_prostor | garaza | vikendica | ostalo
  tipPonude?: 'prodaja' | 'izdavanje';
  kvadratura?: number;
  brojSoba?: string;
  sprat?: string;
}

export interface Ad {
  id: string;
  naslov: string;
  slug: string;
  opis: string;
  kategorija: string;
  potkategorija: string;
  cijena: number;
  lokacija: string;
  slike: string[];
  // Thumbnail verzije (za listing); fallback na full url ako nema thumb-a
  slikeThumbs?: string[];
  vlasnikId: string;
  isPaid: boolean;
  promotionStatus: PromotionStatus;
  promotionPlan: PromotionPlan;
  promotedUntil: number | null;
  promotionPrice: number | null;
  createdAt: number;
  status: AdStatus;
  tipOglasa?: TipOglasa;
  realEstateDetails?: RealEstateDetails;
  details?: Record<string, unknown>;
  carDetails?: CarDetails;
  motorcycleDetails?: MotorcycleDetails;
  kontaktIme: string;
  kontaktTelefon: string;
  instagram?: string;
  facebook?: string;
  pogledi: number;
  glavnaSlikaIndex: number;
}

export interface User {
  id: string;
  ime: string;
  email: string;
  telefon: string;
  datumRegistracije: number;
  profilnaSlika?: string;
  omiljeniOglasi: string[];
  role: 'user' | 'admin';
}

export interface Rating {
  id: string;
  sellerId: string;
  buyerId: string;
  score: number;
  comment?: string;
  createdAt: number;
}

export interface Notification {
  id: string;
  korisnikId: string;
  tip: string;
  naslov: string;
  poruka: string;
  link?: string;
  entityId?: string;
  procitano: boolean;
  createdAt: number;
}

export interface SecurityEvent {
  id: string;
  timestamp: number;
  type: string;
  description: string;
  severity: string;
  userId?: string;
  ip: string;
}

export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  text: string;
  createdAt: number;
  adId?: string;
  conversationId: string;
}

export interface Conversation {
  id: string;
  adId: string;
  participantIds: string[];
  updatedAt: number;
}

export interface CarBrand {
  id: string;
  naziv: string;
  slug: string;
  aktivna: boolean;
}

export interface CarModel {
  id: string;
  markaId: string;
  naziv: string;
  slug: string;
  aktivan: boolean;
}