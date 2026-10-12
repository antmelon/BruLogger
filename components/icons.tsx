import { ColorValue } from 'react-native';
import Svg, { Path, Circle, Line, Rect } from 'react-native-svg';
import { colors } from '../lib/theme';

interface IconProps {
  size?: number;
  color?: ColorValue;
  strokeWidth?: number;
}

const defaults = { size: 24, color: colors.textMedium, strokeWidth: 1.75 };

export function CoffeeIcon({ size = defaults.size, color = defaults.color, strokeWidth = defaults.strokeWidth }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Cup body */}
      <Path
        d="M5 7h11l-1.5 9a2 2 0 01-2 1.75H8.5A2 2 0 016.5 16L5 7z"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
      />
      {/* Handle */}
      <Path
        d="M16 9h2a2 2 0 010 4h-2"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
      {/* Steam lines */}
      <Path d="M8 4.5C8 4.5 8.5 3.5 8 2.5" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <Path d="M11 4.5C11 4.5 11.5 3.5 11 2.5" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    </Svg>
  );
}

export function UserIcon({ size = defaults.size, color = defaults.color, strokeWidth = defaults.strokeWidth }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="8" r="3.5" stroke={color} strokeWidth={strokeWidth} />
      <Path
        d="M4 20c0-4 3.6-7 8-7s8 3 8 7"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function ChartIcon({ size = defaults.size, color = defaults.color, strokeWidth = defaults.strokeWidth }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M3 20h18" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <Rect x="5" y="12" width="3" height="8" rx="1" stroke={color} strokeWidth={strokeWidth} />
      <Rect x="10.5" y="7" width="3" height="13" rx="1" stroke={color} strokeWidth={strokeWidth} />
      <Rect x="16" y="3" width="3" height="17" rx="1" stroke={color} strokeWidth={strokeWidth} />
    </Svg>
  );
}

export function ImageIcon({ size = defaults.size, color = defaults.color, strokeWidth = defaults.strokeWidth }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="3" y="3" width="18" height="18" rx="3" stroke={color} strokeWidth={strokeWidth} />
      <Circle cx="8.5" cy="8.5" r="1.5" stroke={color} strokeWidth={strokeWidth} />
      <Path d="M3 16l5-5 4 4 3-3 6 6" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

/** A coffee bag with a bean on it: the Coffees tab. */
export function BagIcon({ size = defaults.size, color = defaults.color, strokeWidth = defaults.strokeWidth }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Bag, with its folded top */}
      <Path d="M7 3h10l1.5 4v12a2 2 0 01-2 2h-9a2 2 0 01-2-2V7L7 3z" stroke={color} strokeWidth={strokeWidth} strokeLinejoin="round" />
      <Path d="M5.5 7h13" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      {/* Bean */}
      <Path d="M12 10.5c-1.9 0-3 1.6-3 3.5s1.1 3.5 3 3.5 3-1.6 3-3.5-1.1-3.5-3-3.5z" stroke={color} strokeWidth={strokeWidth} />
      <Path d="M12.6 10.6c-1 1-1.2 2.2-.6 3.4.6 1.2.4 2.4-.6 3.4" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    </Svg>
  );
}

export function StarIcon({ size = defaults.size, color = defaults.color, strokeWidth = defaults.strokeWidth }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 2l2.9 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l7.1-1.01L12 2z"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function SearchIcon({ size = defaults.size, color = defaults.color, strokeWidth = defaults.strokeWidth }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="10.5" cy="10.5" r="6" stroke={color} strokeWidth={strokeWidth} />
      <Line x1="15" y1="15" x2="20" y2="20" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    </Svg>
  );
}

export function ArrowLeftIcon({ size = defaults.size, color = defaults.color, strokeWidth = defaults.strokeWidth }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M19 12H5M11 6l-6 6 6 6" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

// Apple's logo, for the website's Sign in with Apple button (iOS draws its own). Path from Simple
// Icons (CC0).
export function AppleIcon({ size = defaults.size, color = defaults.color }: Omit<IconProps, 'strokeWidth'>) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        fill={color}
        d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701"
      />
    </Svg>
  );
}
