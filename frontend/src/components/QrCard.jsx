export default function QrCard() {
  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-6 text-center backdrop-blur-lg">
      <div className="mx-auto w-40 h-40 bg-white rounded-xl flex items-center justify-center mb-4">
        <img
          src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=MixMind-${Math.random()}`}
          alt="QR"
        />
      </div>

      <p className="text-sm text-gray-300 tracking-wide">
        SCAN TO REQUEST A SONG
      </p>
    </div>
  );
}
