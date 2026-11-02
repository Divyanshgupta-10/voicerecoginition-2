# Static robotic hand pose report

## Scope

This revision follows the hardware constraint: **five servo motors control the fingers; there is no actuated wrist**. The library therefore contains poses that can be held still. It does not offer free-text fingerspelling or signs that need a wave, bend, path, location change, a second hand, or facial expression.

ASL is not a sequence of isolated English words. The National Association of the Deaf describes handshape, placement, movement, facial expression, and body movement as parts of visual communication ([NAD overview](https://nad.org/knowledge-hub/american-sign-language/what-is-american-sign-language/)). For the robot, the library includes static I-L-Y, cardinal number 1–5 handshapes, four unverified number 6–9 prototypes, and 16 individual alphabet-letter handshape presets. The number handshapes are static; isolated ASL numbers 1–5 commonly use a palm-back orientation, while number strings use palm-forward orientation ([ASL University number reference](https://www.lifeprint.com/asl101/pages-signs/n/numbers1-10.htm)). The alphabet presets draw on the manual-alphabet handshapes, but only letters whose shapes can be approximated with the available five finger angles are included ([ASL alphabet handshape reference](https://www.strongasl.com/american-sign-language-dictionary/alphabet)). ILY combines the manual-alphabet I, L, and Y handshapes ([ASL University ILY reference](https://www.lifeprint.com/asl101/topics/ily.htm)).

Other entries are ordinary visual gestures, not ASL vocabulary. This distinction is shown in the names and descriptions in the dashboard. They include the OK circle, middle finger, peace/V, thumbs-up, shaka, and rock-horns, plus open-palm and closed-fist mechanical test poses. The middle-finger gesture is rude in many contexts ([Cambridge Dictionary](https://dictionary.cambridge.org/us/dictionary/english/middle-finger?topic=insults-and-abuse)); the OK hand gesture can carry different cultural meanings ([ADL overview](https://southeast.adl.org/resources/hate-symbol/okay-hand-gesture)).

## What was removed

Free-text spelling sequences and the “help,” “hello,” “yes,” “no,” and “thank you” proxy commands are not supported. This version includes single static alphabet handshapes as letter-display presets, but it cannot sequence them to spell a word. Several other ASL signs need movement, location changes, or a second hand, so a static starting shape would falsely imply the full sign. A recognized phrase only selects one stored pose.

The software now contains **36 configured poses**: one ILY handshape, nine number shapes, 16 individual ASL alphabet handshape presets, eight nonverbal gestures, and two mechanical tests. The alphabet entries are single-letter handshapes, not words or fingerspelled sequences. This remains a curated static subset, not every ASL sign or every English word. Many signs cannot be represented by this mechanism.

## Every supported spoken phrase

There are **81 configured phrase aliases** below. Saying an alias selects and holds the listed pose; it does not produce a complete moving sign. Speech recognition may still mishear a phrase, and only these configured aliases are intended to select poses.

| Spoken phrase | Pose selected |
|---|---|
| “I love you”; “show I love you”; “ILY” | I love you (ILY) |
| “number one”; “show number one” | ASL number 1 |
| “number two”; “show number two” | ASL number 2 |
| “number three”; “show number three” | ASL number 3 |
| “number four”; “show number four” | ASL number 4 |
| “number five”; “show number five” | ASL number 5 |
| “okay gesture”; “OK hand”; “show okay” | Okay circle gesture |
| “middle finger”; “fuck you”; “flip off” | Middle finger gesture |
| “peace sign”; “victory sign”; “show peace” | Peace / V gesture |
| “thumbs up”; “show thumbs up”; “approval gesture” | Thumbs up |
| “shaka”; “hang loose”; “call me gesture” | Shaka / hang loose |
| “rock on”; “metal horns”; “rock horns” | Rock horns |
| “open palm”; “open hand”; “open mechanical pose” | Open palm test |
| “closed fist”; “close hand”; “close mechanical pose” | Closed fist test |
| “letter A”; “show ASL letter A” | ASL letter A handshape |
| “letter B”; “show ASL letter B” | ASL letter B handshape |
| “letter C”; “show ASL letter C” | ASL letter C handshape |
| “letter D”; “show ASL letter D” | ASL letter D handshape |
| “letter E”; “show ASL letter E” | ASL letter E handshape |
| “letter F”; “show ASL letter F” | ASL letter F handshape |
| “letter I”; “show ASL letter I” | ASL letter I handshape |
| “letter L”; “show ASL letter L” | ASL letter L handshape |
| “letter M”; “show ASL letter M” | ASL letter M handshape |
| “letter N”; “show ASL letter N” | ASL letter N handshape |
| “letter O”; “show ASL letter O” | ASL letter O handshape |
| “letter S”; “show ASL letter S” | ASL letter S handshape |
| “letter T”; “show ASL letter T” | ASL letter T handshape |
| “letter U”; “show ASL letter U” | ASL letter U handshape |
| “letter W”; “show ASL letter W” | ASL letter W handshape |
| “letter X”; “show ASL letter X” | ASL letter X handshape |
| “number six”; “show ASL number 6” | ASL number 6 prototype |
| “number seven”; “show ASL number 7” | ASL number 7 prototype |
| “number eight”; “show ASL number 8” | ASL number 8 prototype |
| “number nine”; “show ASL number 9” | ASL number 9 prototype |
| “finger gun”; “show finger gun gesture” | Finger gun gesture |
| “point with index”; “show index point gesture” | Index point gesture |

The quoted forms above are the configured phrase aliases, not a promise that every variation or individual word will work. For example, “help,” “hello,” “yes,” and “thank you” are not configured commands. Standalone words such as “number” or “show” are not aliases by themselves.

## Added pose target angles

For each row, the five targets are in **thumb / index / middle / ring / pinky** order. These are coarse prototype targets only. Contact-dependent ASL letters and numbers are not validated, and several presets intentionally share the same five angles because thumb placement and finger spacing are not independently actuated.

| Added pose | Initial target (degrees) | Requirements and limits |
|---|---:|---|
| ASL A | 25 / 145 / 145 / 145 / 145 | Thumb alongside the fist; placement is not fully described by angles. |
| ASL B | 85 / 25 / 25 / 25 / 25 | Thumb must fold across palm. |
| ASL C | 85 / 85 / 85 / 85 / 85 | Curved opening depends on hand geometry. |
| ASL D | 85 / 25 / 145 / 145 / 145 | Thumb placement requires review. |
| ASL E | 85 / 145 / 145 / 145 / 145 | Thumb must meet/cover curled fingertips. |
| ASL F | 85 / 85 / 25 / 25 / 25 | Same coarse angles as OK circle; thumb-index contact and orientation matter. |
| ASL I | 145 / 145 / 145 / 145 / 25 | Pinky extended. |
| ASL L | 25 / 25 / 145 / 145 / 145 | Thumb and index extend in the correct plane. |
| ASL M | 130 / 145 / 145 / 145 / 145 | Thumb target estimates placement under fingers; verify contact. |
| ASL N | 115 / 145 / 145 / 145 / 145 | Thumb target estimates placement under fingers; verify contact. |
| ASL O | 85 / 85 / 85 / 85 / 85 | Shares coarse targets with C; curved geometry must distinguish them. |
| ASL S | 100 / 145 / 145 / 145 / 145 | Thumb target estimates placement across curled fingers; verify it. |
| ASL T | 85 / 145 / 145 / 145 / 145 | Thumb must fit between fingers. |
| ASL U | 145 / 25 / 25 / 145 / 145 | Index and middle stay together; fixed spacing required. |
| ASL W | 145 / 25 / 25 / 25 / 145 | Three fingers extended. |
| ASL X | 145 / 85 / 145 / 145 / 145 | Hooked fingertip may need a multi-joint finger. |
| ASL number 6 | 60 / 25 / 25 / 25 / 25 | Needs thumb-pinky contact; angle is a starting guess, not validated. |
| ASL number 7 | 80 / 25 / 25 / 25 / 25 | Needs thumb-ring contact; angle is a starting guess, not validated. |
| ASL number 8 | 100 / 25 / 25 / 25 / 25 | Needs thumb-middle contact; angle is a starting guess, not validated. |
| ASL number 9 | 120 / 25 / 25 / 25 / 25 | Needs thumb-index contact; angle is a starting guess, not validated. |
| Finger gun | 25 / 25 / 145 / 145 / 145 | Thumb direction depends on mounting. |
| Index point | 145 / 25 / 145 / 145 / 145 | Point direction is fixed by mounting. |

## Initial targets

Angles are software starting targets, not measured joint angles. Finger order is **thumb / index / middle / ring / pinky**. The configuration assumes 25° means extended, 85° partial curl, and 145° flexed. The linkage, servo direction, thumb motion, and safe endpoints must be measured on the built hand. All values stay in the existing 10°–170° test range.

| Pose | Initial target (degrees) | Requirements and limits |
|---|---:|---|
| I love you / ILY | 25 / 25 / 145 / 145 / 25 | Static ASL handshape. Mount palm toward the intended viewer; the thumb must extend in the correct plane. |
| ASL number 1 | 145 / 25 / 145 / 145 / 145 | Index extended. Orientation depends on isolated number vs number string. |
| ASL number 2 | 145 / 25 / 25 / 145 / 145 | Index and middle extended. The mechanism has no spread axis, so build in visible finger spacing. |
| ASL number 3 | 25 / 25 / 25 / 145 / 145 | Thumb, index, and middle extended. Thumb geometry must match the reference. |
| ASL number 4 | 145 / 25 / 25 / 25 / 25 | Four fingers extended; finger spacing is fixed by construction. |
| ASL number 5 | 25 / 25 / 25 / 25 / 25 | All fingers extended; finger spacing is fixed by construction. |
| OK circle gesture | 85 / 85 / 25 / 25 / 25 | Thumb must reach index for contact. If the thumb servo only curls in place, omit this pose. |
| Middle finger | 145 / 145 / 25 / 145 / 145 | One extended finger. The conventional presentation shows the back of the hand to the recipient; fixed palm direction must suit it. |
| Peace / V | 145 / 25 / 25 / 145 / 145 | Requires visible index-middle separation and a suitable fixed hand orientation. |
| Thumbs up | 25 / 145 / 145 / 145 / 145 | Thumb points upward only if the hand is mounted in that orientation. |
| Shaka / hang loose | 25 / 145 / 145 / 145 / 25 | Thumb and pinky extend; cultural meaning varies. |
| Rock horns | 145 / 25 / 145 / 145 / 25 | Index and pinky extend; thumb must hold the middle fingers curled. |
| Open palm test | 25 / 25 / 25 / 25 / 25 | Generic mechanical pose; not called hello or stop. |
| Closed fist test | 145 / 145 / 145 / 145 / 145 | Generic mechanical pose; not called yes. Thumb tuck depends on construction. |

The five actuators provide finger flexion targets only. The target angles for numbers 6–9 assume the thumb follows an arc that can reach each finger; the mechanism must be designed and calibrated to confirm that. The actuators do not guarantee contact, spacing, palm orientation, or thumb opposition. The hand must be designed around the desired fixed viewing direction. In particular, some gestures need opposite palm presentations; a non-rotating wrist cannot switch between them. If the final mount supports only one orientation, remove poses that require another orientation rather than presenting them as accurate.

## Build and calibration recommendations

1. Decide which side of the hand the audience will see and mount the wrist at that fixed orientation.
2. Design the thumb servo so it can reach the index if the OK circle is retained. If that motion is outside its single servo axis, delete that preset.
3. Give the index and middle fingers enough natural separation for number 2 and the V gesture; no servo can add lateral spread later.
4. After construction, test each finger unloaded at small increments. Measure the safe servo endpoints and replace the example targets in `config/gestures.json`.
5. Compare ASL number and ILY poses with a trusted video and ask an ASL-fluent Deaf signer to review them before presenting them as educational sign output. Label ordinary gestures as gestures.

## Implementation changes

The dashboard quick list and gesture library now contain only static entries. The free-text spelling input and special “spell …” microphone route have been removed. Pose IDs remain configurable and the ESP32 firmware accepts them through the acknowledged `POSE` protocol. The simulator and API continue to support individual finger calibration and saving a pose.

## Word count

This report contains **2,247 words** by `wc -w`, including headings, table, and source list.
