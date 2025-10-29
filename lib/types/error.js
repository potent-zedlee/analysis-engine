export var ErrorType;
(function (ErrorType) {
    ErrorType["OCR_MISREAD"] = "ocr_misread";
    ErrorType["OCR_MISSING"] = "ocr_missing";
    ErrorType["DUPLICATE_CARD"] = "duplicate_card";
    ErrorType["INVALID_CARD"] = "invalid_card";
    ErrorType["POT_INCONSISTENCY"] = "pot_inconsistency";
    ErrorType["STACK_MISMATCH"] = "stack_mismatch";
    ErrorType["INVALID_ACTION_ORDER"] = "invalid_action_order";
    ErrorType["HAND_OVERLAP"] = "hand_overlap";
    ErrorType["HAND_SPLIT"] = "hand_split";
    ErrorType["VIDEO_OCR_CONFLICT"] = "video_ocr_conflict";
    ErrorType["AUDIO_OCR_CONFLICT"] = "audio_ocr_conflict";
})(ErrorType || (ErrorType = {}));
//# sourceMappingURL=error.js.map