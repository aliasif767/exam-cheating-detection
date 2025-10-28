import { useState, useRef, useCallback } from "react";
import {
  Camera,
  Upload,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Eye,
  Shield,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import LoadingSpinner from "@/components/LoadingSpinner";
import { toast } from "sonner";

export default function FaceVerification() {
  const { user, token, updateUser } = useAuth();
  const [step, setStep] = useState<"capture" | "review" | "upload">("capture");
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const startCamera = async () => {
    try {
      setIsCapturing(true);
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: "user",
        },
      });

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        setStream(mediaStream);
      }
    } catch (error) {
      console.error("Error accessing camera:", error);
      toast.error("Failed to access camera. Please check permissions.");
    } finally {
      setIsCapturing(false);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      const context = canvas.getContext("2d");

      if (context) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0);

        const imageData = canvas.toDataURL("image/jpeg", 0.8);
        setCapturedImage(imageData);
        setStep("review");
        stopCamera();
      }
    }
  };

  const retakePhoto = () => {
    setCapturedImage(null);
    setStep("capture");
    startCamera();
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setCapturedImage(e.target?.result as string);
        setStep("review");
      };
      reader.readAsDataURL(file);
    }
  };

  const submitVerification = async () => {
    if (!capturedImage) return;

    setIsUploading(true);
    try {
      // Convert base64 to blob
      const response = await fetch(capturedImage);
      const blob = await response.blob();

      const formData = new FormData();
      formData.append("image", blob, "face.jpg");

      const apiResponse = await fetch(
        "http://localhost:5000/api/verification/face/register",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        },
      );

      const data = await apiResponse.json();

      if (apiResponse.ok) {
        toast.success(data.message);
        updateUser({ verificationStatus: data.data.verificationStatus });
        setCapturedImage(null);
        setStep("capture");
      } else {
        toast.error(data.message || "Face registration failed");
      }
    } catch (error) {
      console.error("Error submitting verification:", error);
      toast.error("Network error. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  const getVerificationStatusInfo = () => {
    switch (user?.verificationStatus) {
      case "verified":
        return {
          color: "green",
          icon: CheckCircle,
          text: "Verified",
          description:
            "Your face verification is complete. You can now take exams.",
        };
      case "pending":
        return {
          color: "yellow",
          icon: AlertCircle,
          text: "Pending Review",
          description: "Your verification is being reviewed by administrators.",
        };
      default:
        return {
          color: "red",
          icon: AlertCircle,
          text: "Not Verified",
          description:
            "Please complete face verification to access exam features.",
        };
    }
  };

  const statusInfo = getVerificationStatusInfo();

  return (
    <DashboardLayout title="Face Verification">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header Section */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-700 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Face Verification</h2>
              <p className="text-blue-100 mt-1">
                Secure your exam access with biometric verification
              </p>
            </div>
            <Shield className="w-12 h-12 text-blue-200" />
          </div>
        </div>

        {/* Current Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <statusInfo.icon
                className={`w-5 h-5 text-${statusInfo.color}-600`}
              />
              Verification Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <Badge
                  variant={
                    statusInfo.color === "green"
                      ? "default"
                      : statusInfo.color === "yellow"
                        ? "secondary"
                        : "destructive"
                  }
                  className="mb-2"
                >
                  {statusInfo.text}
                </Badge>
                <p className="text-sm text-gray-600">
                  {statusInfo.description}
                </p>
              </div>
              {user?.profileImage && (
                <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-gray-200">
                  <img
                    src={user.profileImage}
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-blue-600" />
              Verification Instructions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-white font-bold">1</span>
                </div>
                <h3 className="font-medium mb-2">Position Yourself</h3>
                <p className="text-sm text-gray-600">
                  Look directly at the camera with good lighting
                </p>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-white font-bold">2</span>
                </div>
                <h3 className="font-medium mb-2">Capture Clear Photo</h3>
                <p className="text-sm text-gray-600">
                  Ensure your entire face is visible and in focus
                </p>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-white font-bold">3</span>
                </div>
                <h3 className="font-medium mb-2">Submit for Review</h3>
                <p className="text-sm text-gray-600">
                  Wait for admin approval to complete verification
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Verification Process */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Camera/Upload Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Camera className="w-5 h-5 text-blue-600" />
                {step === "capture"
                  ? "Capture Photo"
                  : step === "review"
                    ? "Review Photo"
                    : "Upload Photo"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {step === "capture" && (
                <div className="space-y-4">
                  {stream ? (
                    <div className="relative">
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        className="w-full rounded-lg bg-gray-100"
                        style={{ aspectRatio: "4/3" }}
                      />
                      <canvas ref={canvasRef} className="hidden" />
                      <div className="absolute inset-0 pointer-events-none">
                        <div className="w-full h-full flex items-center justify-center">
                          <div className="w-48 h-60 border-2 border-white rounded-lg border-dashed" />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="w-full h-64 bg-gray-100 rounded-lg flex items-center justify-center">
                      <div className="text-center">
                        <Camera className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                        <p className="text-gray-500">Camera not started</p>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-3">
                    {stream ? (
                      <>
                        <Button
                          onClick={capturePhoto}
                          className="flex-1"
                          disabled={isCapturing}
                        >
                          <Camera className="w-4 h-4 mr-2" />
                          Capture Photo
                        </Button>
                        <Button onClick={stopCamera} variant="outline">
                          Stop Camera
                        </Button>
                      </>
                    ) : (
                      <Button
                        onClick={startCamera}
                        className="flex-1"
                        disabled={isCapturing}
                      >
                        {isCapturing ? (
                          <LoadingSpinner size="sm" className="mr-2" />
                        ) : (
                          <Camera className="w-4 h-4 mr-2" />
                        )}
                        Start Camera
                      </Button>
                    )}
                  </div>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-200" />
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-2 bg-white text-gray-500">or</span>
                    </div>
                  </div>

                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    variant="outline"
                    className="w-full"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Photo
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </div>
              )}

              {step === "review" && capturedImage && (
                <div className="space-y-4">
                  <div className="relative">
                    <img
                      src={capturedImage}
                      alt="Captured"
                      className="w-full rounded-lg"
                    />
                  </div>
                  <div className="flex gap-3">
                    <Button
                      onClick={submitVerification}
                      className="flex-1"
                      disabled={isUploading}
                    >
                      {isUploading ? (
                        <LoadingSpinner size="sm" className="mr-2" />
                      ) : (
                        <CheckCircle className="w-4 h-4 mr-2" />
                      )}
                      Submit for Verification
                    </Button>
                    <Button onClick={retakePhoto} variant="outline">
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Retake
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tips and Guidelines */}
          <Card>
            <CardHeader>
              <CardTitle>Verification Tips</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Do:</strong>
                  <ul className="mt-2 space-y-1 text-sm">
                    <li>• Ensure good lighting on your face</li>
                    <li>• Look directly at the camera</li>
                    <li>• Remove glasses if possible</li>
                    <li>• Keep a neutral expression</li>
                    <li>• Make sure your entire face is visible</li>
                  </ul>
                </AlertDescription>
              </Alert>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Don't:</strong>
                  <ul className="mt-2 space-y-1 text-sm">
                    <li>• Use photos from social media</li>
                    <li>• Include other people in the frame</li>
                    <li>• Cover your face with hands or objects</li>
                    <li>• Use blurry or low-quality images</li>
                    <li>• Take photos in poor lighting</li>
                  </ul>
                </AlertDescription>
              </Alert>

              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">
                  Privacy Notice
                </h4>
                <p className="text-sm text-blue-700">
                  Your facial data is encrypted and stored securely. It's only
                  used for exam verification and will not be shared with third
                  parties.
                </p>
              </div>

              <div className="bg-yellow-50 p-4 rounded-lg">
                <h4 className="font-medium text-yellow-900 mb-2">
                  Verification Process
                </h4>
                <p className="text-sm text-yellow-700">
                  Admin review typically takes 24-48 hours. You'll receive an
                  email notification once approved.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Previous Submissions */}
        {user?.verificationStatus && (
          <Card>
            <CardHeader>
              <CardTitle>Verification History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">Current Submission</p>
                    <p className="text-sm text-gray-600">
                      Status: {statusInfo.text}
                    </p>
                  </div>
                  <Badge
                    variant={
                      statusInfo.color === "green"
                        ? "default"
                        : statusInfo.color === "yellow"
                          ? "secondary"
                          : "destructive"
                    }
                  >
                    {statusInfo.text}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
