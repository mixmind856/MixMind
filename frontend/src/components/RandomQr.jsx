import { useMemo } from "react";
import { QRCodeCanvas } from "qrcode.react";

export default function RandomQr() {
  const randomValue = useMemo(() => {
    return `DJ-${Math.random().toString(36).slice(2, 10)}`;
  }, []);

  return (
    <div className="bg-white p-4 rounded-xl mb-4 flex justify-center">
      <QRCodeCanvas
        value={randomValue}
        size={160}
        bgColor="#ffffff"
        fgColor="#000000"
        level="H"
      />
    </div>
  );
}
