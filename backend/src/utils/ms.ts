import msLib from "ms";

export default function ms(value: string): number {
  return msLib(value as any) as unknown as number;
}
