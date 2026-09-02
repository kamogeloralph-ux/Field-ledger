# Fleet register extraction review

The CSV was created from the three uploaded fleet-list photographs and reconciled across overlapping views.

| Check | Result |
|---|---:|
| Extracted rows | 94 |
| Unique fleet numbers | 94 |
| Missing registrations | 9 |
| Rows marked for manual review | 12 |
| Duplicate registrations | 1 |

The duplicate registration is `NB67DNGP`, appearing for fleet numbers `8563850` and `8563851` in the source photos. Confirm whether that duplicate is intentional or whether one character was obscured.

Rows marked `needs_manual_review` either have a registration that could not be read with confidence or occur in the faint lower section of the photograph. They are retained with an `ocr_candidate` value where possible and a blank `registration` where no defensible transcription was available. Do not import those rows into the production truck register until they are confirmed.

The CSV columns are `fleet_number`, `registration`, `source`, `verification_status`, `ocr_candidate`, and `notes`.
