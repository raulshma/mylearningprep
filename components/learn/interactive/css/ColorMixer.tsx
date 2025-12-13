'use client';

import { useState, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Palette, RotateCcw, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { ColorMixerProps, ColorModel } from './types';
import {
  rgbToHex,
  hexToRgb,
  rgbToHsl,
  hslToRgb,
  formatRgb,
  formatHsl,
  isValidHex,
  type RGBColor,
  type HSLColor,
} from './shared/ColorConverter';

const DEFAULT_COLOR: RGBColor = { r: 59, g: 130, b: 246 }; // Primary blue

type GradientType = 'linear' | 'radial';
type GradientDirection = 'to right' | 'to bottom' | 'to bottom right' | '45deg' | '90deg' | '135deg';

interface ColorHarmony {
  name: string;
  colors: string[];
  description: string;
}

export function ColorMixer({
  initialColor = rgbToHex(DEFAULT_COLOR),
  showModels = ['rgb', 'hsl', 'hex'],
  showGradient = true,
}: ColorMixerProps) {
  // Parse initial color
  const initialRgb = useMemo(() => {
    const parsed = hexToRgb(initialColor);
    return parsed || DEFAULT_COLOR;
  }, [initialColor]);

  const [rgb, setRgb] = useState<RGBColor>(initialRgb);
  const [hexInput, setHexInput] = useState(rgbToHex(initialRgb));
  const [copied, setCopied] = useState(false);

  // Gradient state
  const [gradientType, setGradientType] = useState<GradientType>('linear');
  const [gradientDirection, setGradientDirection] = useState<GradientDirection>('to right');
  const [gradientColor2, setGradientColor2] = useState<RGBColor>({ r: 168, g: 85, b: 247 }); // Purple

  // Derived values
  const hsl = useMemo(() => rgbToHsl(rgb), [rgb]);
  const hex = useMemo(() => rgbToHex(rgb), [rgb]);

  // Helper function to convert HSL to hex - defined before harmonies
  const hslToHex = (hslColor: HSLColor): string => {
    return rgbToHex(hslToRgb(hslColor));
  };

  // Color harmonies - computed directly without useMemo to avoid React Compiler issues
  const baseHue = hsl.h;
  const harmonies: ColorHarmony[] = [
    {
      name: 'Complementary',
      colors: [
        hex,
        hslToHex({ h: (baseHue + 180) % 360, s: hsl.s, l: hsl.l }),
      ],
      description: 'Opposite on the color wheel',
    },
    {
      name: 'Analogous',
      colors: [
        hslToHex({ h: (baseHue - 30 + 360) % 360, s: hsl.s, l: hsl.l }),
        hex,
        hslToHex({ h: (baseHue + 30) % 360, s: hsl.s, l: hsl.l }),
      ],
      description: 'Adjacent colors on the wheel',
    },
    {
      name: 'Triadic',
      colors: [
        hex,
        hslToHex({ h: (baseHue + 120) % 360, s: hsl.s, l: hsl.l }),
        hslToHex({ h: (baseHue + 240) % 360, s: hsl.s, l: hsl.l }),
      ],
      description: 'Evenly spaced around the wheel',
    },
    {
      name: 'Split Complementary',
      colors: [
        hex,
        hslToHex({ h: (baseHue + 150) % 360, s: hsl.s, l: hsl.l }),
        hslToHex({ h: (baseHue + 210) % 360, s: hsl.s, l: hsl.l }),
      ],
      description: 'Base + two adjacent to complement',
    },
  ];

  // Gradient CSS
  const gradientCss = useMemo(() => {
    const color1 = formatRgb(rgb);
    const color2 = formatRgb(gradientColor2);

    if (gradientType === 'linear') {
      return `linear-gradient(${gradientDirection}, ${color1}, ${color2})`;
    } else {
      return `radial-gradient(circle, ${color1}, ${color2})`;
    }
  }, [rgb, gradientColor2, gradientType, gradientDirection]);

  // Update handlers
  const updateRgb = useCallback((updates: Partial<RGBColor>) => {
    setRgb((prev) => {
      const newRgb = { ...prev, ...updates };
      setHexInput(rgbToHex(newRgb));
      return newRgb;
    });
  }, []);

  const updateHsl = useCallback((updates: Partial<HSLColor>) => {
    const newHsl = { ...hsl, ...updates };
    const newRgb = hslToRgb(newHsl);
    setRgb(newRgb);
    setHexInput(rgbToHex(newRgb));
  }, [hsl]);

  const handleHexInputChange = useCallback((value: string) => {
    setHexInput(value);
    if (isValidHex(value)) {
      const parsed = hexToRgb(value);
      if (parsed) {
        setRgb(parsed);
      }
    }
  }, []);

  const handleReset = useCallback(() => {
    setRgb(initialRgb);
    setHexInput(rgbToHex(initialRgb));
    setGradientColor2({ r: 168, g: 85, b: 247 });
  }, [initialRgb]);

  const handleCopy = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }, []);

  return (
    <div className="w-full max-w-6xl mx-auto my-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Palette className="w-5 h-5 text-primary" />
          Color Mixer
        </h3>
        <Button variant="outline" size="sm" onClick={handleReset} className="gap-1">
          <RotateCcw className="w-3 h-3" />
          Reset
        </Button>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Color Display & Controls */}
        <div className="space-y-6">
          {/* Color Preview */}
          <Card className="p-8">
            <motion.div
              layout
              className="w-full h-48 rounded-lg shadow-lg border-2 border-border"
              style={{ backgroundColor: formatRgb(rgb) }}
            />
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Current Color</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleCopy(hex)}
                  className="gap-1 h-7"
                >
                  {copied ? (
                    <Check className="w-3 h-3 text-green-500" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                  Copy
                </Button>
              </div>
            </div>
          </Card>

          {/* Color Models */}
          <Card className="p-6 space-y-6">
            {/* RGB Controls */}
            {showModels.includes('rgb') && (
              <div>
                <h4 className="text-sm font-semibold mb-4">RGB (Red, Green, Blue)</h4>
                <div className="space-y-4">
                  {(['r', 'g', 'b'] as const).map((channel) => (
                    <div key={channel}>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-xs text-muted-foreground uppercase">
                          {channel}
                        </label>
                        <span className="text-xs font-mono">{rgb[channel]}</span>
                      </div>
                      <Slider
                        value={[rgb[channel]]}
                        onValueChange={([value]) => updateRgb({ [channel]: value })}
                        min={0}
                        max={255}
                        step={1}
                        className="w-full"
                      />
                    </div>
                  ))}
                  <div className="pt-2 border-t">
                    <code className="text-xs font-mono text-muted-foreground">
                      {formatRgb(rgb)}
                    </code>
                  </div>
                </div>
              </div>
            )}

            {/* HSL Controls */}
            {showModels.includes('hsl') && (
              <div className="border-t pt-6">
                <h4 className="text-sm font-semibold mb-4">HSL (Hue, Saturation, Lightness)</h4>
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs text-muted-foreground">Hue</label>
                      <span className="text-xs font-mono">{hsl.h}°</span>
                    </div>
                    <Slider
                      value={[hsl.h]}
                      onValueChange={([value]) => updateHsl({ h: value })}
                      min={0}
                      max={360}
                      step={1}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs text-muted-foreground">Saturation</label>
                      <span className="text-xs font-mono">{hsl.s}%</span>
                    </div>
                    <Slider
                      value={[hsl.s]}
                      onValueChange={([value]) => updateHsl({ s: value })}
                      min={0}
                      max={100}
                      step={1}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs text-muted-foreground">Lightness</label>
                      <span className="text-xs font-mono">{hsl.l}%</span>
                    </div>
                    <Slider
                      value={[hsl.l]}
                      onValueChange={([value]) => updateHsl({ l: value })}
                      min={0}
                      max={100}
                      step={1}
                      className="w-full"
                    />
                  </div>
                  <div className="pt-2 border-t">
                    <code className="text-xs font-mono text-muted-foreground">
                      {formatHsl(hsl)}
                    </code>
                  </div>
                </div>
              </div>
            )}

            {/* Hex Input */}
            {showModels.includes('hex') && (
              <div className="border-t pt-6">
                <h4 className="text-sm font-semibold mb-4">Hexadecimal</h4>
                <div className="space-y-2">
                  <Input
                    value={hexInput}
                    onChange={(e) => handleHexInputChange(e.target.value)}
                    placeholder="#000000"
                    className={cn(
                      'font-mono',
                      !isValidHex(hexInput) && hexInput !== '' && 'border-red-500'
                    )}
                  />
                  {!isValidHex(hexInput) && hexInput !== '' && (
                    <p className="text-xs text-red-500">Invalid hex color format</p>
                  )}
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* Gradient Builder & Harmonies */}
        <div className="space-y-6">
          {/* Gradient Builder */}
          {showGradient && (
            <Card className="p-6 space-y-4">
              <h4 className="text-sm font-semibold">Gradient Builder</h4>

              {/* Gradient Preview */}
              <div
                className="w-full h-32 rounded-lg shadow-lg border-2 border-border"
                style={{ background: gradientCss }}
              />

              {/* Gradient Type */}
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">Type</label>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant={gradientType === 'linear' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setGradientType('linear')}
                  >
                    Linear
                  </Button>
                  <Button
                    variant={gradientType === 'radial' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setGradientType('radial')}
                  >
                    Radial
                  </Button>
                </div>
              </div>

              {/* Direction (for linear) */}
              {gradientType === 'linear' && (
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground">Direction</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['to right', 'to bottom', 'to bottom right'] as GradientDirection[]).map(
                      (dir) => (
                        <Button
                          key={dir}
                          variant={gradientDirection === dir ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setGradientDirection(dir)}
                          className="text-xs"
                        >
                          {dir.replace('to ', '')}
                        </Button>
                      )
                    )}
                  </div>
                </div>
              )}

              {/* Second Color */}
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">Second Color</label>
                <div className="space-y-3">
                  {(['r', 'g', 'b'] as const).map((channel) => (
                    <div key={channel}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-muted-foreground uppercase">
                          {channel}
                        </span>
                        <span className="text-xs font-mono">{gradientColor2[channel]}</span>
                      </div>
                      <Slider
                        value={[gradientColor2[channel]]}
                        onValueChange={([value]) =>
                          setGradientColor2((prev) => ({ ...prev, [channel]: value }))
                        }
                        min={0}
                        max={255}
                        step={1}
                        className="w-full"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* CSS Output */}
              <div className="pt-2 border-t">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted-foreground">CSS</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCopy(gradientCss)}
                    className="gap-1 h-6"
                  >
                    {copied ? (
                      <Check className="w-3 h-3 text-green-500" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </Button>
                </div>
                <code className="text-xs font-mono text-muted-foreground break-all">
                  background: {gradientCss};
                </code>
              </div>
            </Card>
          )}

          {/* Color Harmonies */}
          <Card className="p-6 space-y-4">
            <h4 className="text-sm font-semibold">Color Harmony Suggestions</h4>
            <div className="space-y-4">
              {harmonies.map((harmony) => (
                <div key={harmony.name} className="space-y-2">
                  <div>
                    <div className="text-sm font-medium">{harmony.name}</div>
                    <div className="text-xs text-muted-foreground">{harmony.description}</div>
                  </div>
                  <div className="flex gap-2">
                    {harmony.colors.map((color, idx) => (
                      <div
                        key={idx}
                        className="flex-1 h-12 rounded border-2 border-border cursor-pointer hover:scale-105 transition-transform"
                        style={{ backgroundColor: color }}
                        onClick={() => {
                          const parsed = hexToRgb(color);
                          if (parsed) {
                            setRgb(parsed);
                            setHexInput(color);
                          }
                        }}
                        title={`Click to use ${color}`}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* Info */}
      <div className="text-xs text-muted-foreground">
        💡 Adjust the sliders to explore different color models. RGB uses red, green, and blue
        channels (0-255). HSL uses hue (0-360°), saturation (0-100%), and lightness (0-100%).
        Click harmony colors to apply them instantly.
      </div>
    </div>
  );
}
