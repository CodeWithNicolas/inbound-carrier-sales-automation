declare module 'react-simple-maps' {
  import { ComponentType, SVGProps, ReactNode } from 'react';

  export interface ComposableMapProps {
    projection?: string;
    projectionConfig?: Record<string, any>;
    width?: number;
    height?: number;
    style?: React.CSSProperties;
    children?: ReactNode;
  }

  export interface GeographiesProps {
    geography: string | object | any[];
    children?: (data: { geographies: any[] }) => ReactNode;
    parseGeographies?: (geographies: any) => any[];
  }

  export interface GeographyProps {
    geography: any;
    fill?: string;
    stroke?: string;
    strokeWidth?: number;
    style?: {
      default?: React.CSSProperties;
      hover?: React.CSSProperties;
      pressed?: React.CSSProperties;
    };
    [key: string]: any;
  }

  export interface MarkerProps {
    coordinates: [number, number];
    children?: ReactNode;
    onMouseEnter?: () => void;
    onMouseLeave?: () => void;
    style?: React.CSSProperties;
  }

  export interface LineProps {
    from: [number, number];
    to: [number, number];
    stroke?: string;
    strokeWidth?: number;
    strokeLinecap?: 'butt' | 'round' | 'square';
    strokeLinejoin?: 'miter' | 'round' | 'bevel';
    opacity?: number;
    style?: React.CSSProperties;
    onMouseEnter?: () => void;
    onMouseLeave?: () => void;
    [key: string]: any;
  }

  export const ComposableMap: ComponentType<ComposableMapProps>;
  export const Geographies: ComponentType<GeographiesProps>;
  export const Geography: ComponentType<GeographyProps>;
  export const Marker: ComponentType<MarkerProps>;
  export const Line: ComponentType<LineProps>;
}

