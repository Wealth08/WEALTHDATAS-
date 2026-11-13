// Slip types (Regular, Standard, Premium, V-NIN). Pictures are in public/assets and served from /assets/<name>.png
export interface SlipTier {
  id: string; // service id in the database
  label: string;
  image: string;
}

export interface SlipFamily {
  cardTitle: string; // the title shown on the dashboard card
  mainId: string; // the card that represents this family on the dashboard
  tiers: SlipTier[];
}

export const SLIP_FAMILIES: SlipFamily[] = [
  {
    cardTitle: 'NIN Verification',
    mainId: 'nin-premium-slip',
    tiers: [
      { id: 'nin-regular-slip', label: 'Regular Slip', image: '/assets/regular.png' },
      { id: 'nin-standard-slip', label: 'Standard Slip', image: '/assets/standard.png' },
      { id: 'nin-premium-slip', label: 'Premium Slip', image: '/assets/premium.png' },
      { id: 'nin-vnin-slip', label: 'V-NIN Slip', image: '/assets/vnin.png' },
    ],
  },
  {
    cardTitle: 'NIN by Phone',
    mainId: 'nin-by-phone',
    tiers: [
      { id: 'nin-by-phone-regular', label: 'Regular Slip', image: '/assets/regular.png' },
      { id: 'nin-by-phone-standard', label: 'Standard Slip', image: '/assets/standard.png' },
      { id: 'nin-by-phone', label: 'Premium Slip', image: '/assets/premium.png' },
    ],
  },
];

export const familyOf = (serviceId: string): SlipFamily | undefined =>
  SLIP_FAMILIES.find((f) => f.tiers.some((t) => t.id === serviceId));

// ids that are shown inside the family card instead of as their own card
export const HIDDEN_ON_DASHBOARD: string[] = SLIP_FAMILIES.flatMap((f) =>
  f.tiers.filter((t) => t.id !== f.mainId).map((t) => t.id)
);
