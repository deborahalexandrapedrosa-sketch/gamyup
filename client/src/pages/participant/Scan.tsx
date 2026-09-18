import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Html5Qrcode } from "html5-qrcode";
import { Button, Card, Input, Label } from "../../components/ui";

function extractToken(text: string) {
  try {
    const url = new URL(text);
    const parts = url.pathname.split("/").filter(Boolean);
    return parts[parts.length - 1];
  } catch {
    return text.trim();
  }
}

export default function Scan() {
  const navigate = useNavigate();
  const [manualToken, setManualToken] = useState("");
  const [cameraError, setCameraError] = useState("");
  const [cameraActive, setCameraActive] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const divId = "qr-reader";

  useEffect(() => {
    return () => {
      scannerRef.current?.stop().catch(() => {});
    };
  }, []);

  async function startCamera() {
    setCameraError("");
    try {
      const scanner = new Html5Qrcode(divId);
      scannerRef.current = scanner;
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: 240 },
        (decodedText) => {
          const token = extractToken(decodedText);
          scanner.stop().catch(() => {});
          navigate(`/app/a/${token}`);
        },
        () => {}
      );
      setCameraActive(true);
    } catch {
      setCameraError("Não foi possível acessar a câmera. Use a entrada manual abaixo.");
      setCameraActive(false);
    }
  }

  function handleManualSubmit() {
    if (!manualToken.trim()) return;
    navigate(`/app/a/${extractToken(manualToken.trim())}`);
  }

  return (
    <div className="max-w-md mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-ink-950">📷 Escanear QR Code</h1>
        <p className="text-slate-500 text-sm mt-1">Aponte a câmera para o QR Code exibido pelo facilitador</p>
      </div>

      <Card className="text-center">
        <div id={divId} className="rounded-xl overflow-hidden bg-slate-900 min-h-[240px] flex items-center justify-center">
          {!cameraActive && <span className="text-white/40 text-sm">Câmera desligada</span>}
        </div>
        {cameraError && <p className="text-sm text-rose-600 font-medium mt-3">{cameraError}</p>}
        <Button className="w-full mt-4" onClick={startCamera} disabled={cameraActive}>
          {cameraActive ? "Câmera ativa..." : "Ativar câmera"}
        </Button>
      </Card>

      <Card>
        <Label>Ou digite/cole o código da atividade</Label>
        <div className="flex gap-2">
          <Input
            value={manualToken}
            onChange={(e) => setManualToken(e.target.value)}
            placeholder="Ex: s_awv0swAs ou link completo"
            onKeyDown={(e) => e.key === "Enter" && handleManualSubmit()}
          />
          <Button variant="secondary" onClick={handleManualSubmit}>
            Ir
          </Button>
        </div>
      </Card>
    </div>
  );
}
