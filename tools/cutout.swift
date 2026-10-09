// Usage: cutout <in-image> <out.png>
// Lifts the foreground subject (the person) with Apple Vision (same model as Photos' "Lift subject"), on-device.
// Keeps only the largest subject, cropped to it. Refuses (exit 7) when a second subject is comparably large
// (podium / group shot): cutting one of several people out risks keeping the wrong person.
import Foundation
import Vision
import CoreImage
import ImageIO
import UniformTypeIdentifiers

func fail(_ msg: String, _ code: Int32) -> Never { FileHandle.standardError.write("\(msg)\n".data(using: .utf8)!); exit(code) }

let args = CommandLine.arguments
guard args.count == 3 else { fail("usage: cutout in out.png", 2) }
guard let src = CIImage(contentsOf: URL(fileURLWithPath: args[1])) else { fail("cannot read", 3) }
let req = VNGenerateForegroundInstanceMaskRequest()
let handler = VNImageRequestHandler(ciImage: src)
do { try handler.perform([req]) } catch { fail("vision: \(error)", 4) }
guard let obs = req.results?.first, !obs.allInstances.isEmpty else { fail("no subject", 5) }

// instance areas from the low-res label mask
let mask = obs.instanceMask
CVPixelBufferLockBaseAddress(mask, .readOnly)
let w = CVPixelBufferGetWidth(mask), h = CVPixelBufferGetHeight(mask), row = CVPixelBufferGetBytesPerRow(mask)
let base = CVPixelBufferGetBaseAddress(mask)!.assumingMemoryBound(to: UInt8.self)
var area = [Int: Int]()
for y in 0..<h { for x in 0..<w { let v = Int(base[y * row + x]); if v > 0 { area[v, default: 0] += 1 } } }
CVPixelBufferUnlockBaseAddress(mask, .readOnly)
let ranked = area.sorted { $0.value > $1.value }
guard let top = ranked.first else { fail("no subject", 5) }
if ranked.count > 1 && Double(ranked[1].value) > 0.25 * Double(top.value) { fail("several subjects (\(ranked.count))", 7) }
// a subject filling under 4% of the frame is a car on track / a far shot, not a portrait
if Double(top.value) < 0.04 * Double(w * h) { fail("subject too small", 8) }

let masked: CVPixelBuffer
do { masked = try obs.generateMaskedImage(ofInstances: IndexSet(integer: top.key), from: handler, croppedToInstancesExtent: true) }
catch { fail("mask: \(error)", 6) }
let ci = CIImage(cvPixelBuffer: masked)
guard let cg = CIContext().createCGImage(ci, from: ci.extent) else { fail("render", 6) }
guard let dest = CGImageDestinationCreateWithURL(URL(fileURLWithPath: args[2]) as CFURL, UTType.png.identifier as CFString, 1, nil) else { fail("write", 6) }
CGImageDestinationAddImage(dest, cg, nil)
CGImageDestinationFinalize(dest)
print("ok \(cg.width)x\(cg.height)")
