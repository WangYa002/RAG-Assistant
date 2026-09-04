// 统一线性图标：1.7 描边、圆角端点、16px 基准
type IconProps = {
  size?: number;
  className?: string;
  style?: React.CSSProperties;
};

function S({ children, size = 16, className, style }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={className}
      style={style}
    >
      {children}
    </svg>
  );
}

export const IconDatabase = (p: IconProps) => (
  <S {...p}>
    <ellipse cx="12" cy="5" rx="8" ry="3" />
    <path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5" />
    <path d="M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3" />
  </S>
);

export const IconChat = (p: IconProps) => (
  <S {...p}>
    <path d="M21 15a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </S>
);

export const IconClipboard = (p: IconProps) => (
  <S {...p}>
    <rect x="8" y="2" width="8" height="4" rx="1" />
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
    <path d="m9 14 2 2 4-4" />
  </S>
);

export const IconChart = (p: IconProps) => (
  <S {...p}>
    <path d="M3 3v18h18" />
    <path d="M8 17v-7" />
    <path d="M13 17V6" />
    <path d="M18 17v-4" />
  </S>
);

export const IconSliders = (p: IconProps) => (
  <S {...p}>
    <path d="M4 6h9" />
    <path d="M17 6h3" />
    <path d="M4 12h3" />
    <path d="M11 12h9" />
    <path d="M4 18h11" />
    <path d="M19 18h1" />
    <circle cx="15" cy="6" r="2" />
    <circle cx="9" cy="12" r="2" />
    <circle cx="17" cy="18" r="2" />
  </S>
);

export const IconSun = (p: IconProps) => (
  <S {...p}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </S>
);

export const IconMoon = (p: IconProps) => (
  <S {...p}>
    <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
  </S>
);

export const IconUpload = (p: IconProps) => (
  <S {...p}>
    <path d="M12 16V4" />
    <path d="m7 9 5-5 5 5" />
    <path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
  </S>
);

export const IconRefresh = (p: IconProps) => (
  <S {...p}>
    <path d="M21 12a9 9 0 1 1-2.6-6.4" />
    <path d="M21 3v6h-6" />
  </S>
);

export const IconTrash = (p: IconProps) => (
  <S {...p}>
    <path d="M3 6h18" />
    <path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2" />
    <path d="m19 6-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
  </S>
);

export const IconCheck = (p: IconProps) => (
  <S {...p}>
    <path d="m4 12 5 5L20 6" />
  </S>
);

export const IconX = (p: IconProps) => (
  <S {...p}>
    <path d="M6 6l12 12M18 6 6 18" />
  </S>
);

export const IconChevron = (p: IconProps) => (
  <S {...p}>
    <path d="m6 9 6 6 6-6" />
  </S>
);

export const IconSend = (p: IconProps) => (
  <S {...p}>
    <path d="M12 19V5" />
    <path d="m5 12 7-7 7 7" />
  </S>
);

export const IconPlus = (p: IconProps) => (
  <S {...p}>
    <path d="M12 5v14M5 12h14" />
  </S>
);

export const IconDownload = (p: IconProps) => (
  <S {...p}>
    <path d="M12 3v12" />
    <path d="m7 10 5 5 5-5" />
    <path d="M4 21h16" />
  </S>
);
