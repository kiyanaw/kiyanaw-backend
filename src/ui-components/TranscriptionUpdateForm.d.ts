/***************************************************************************
 * The contents of this file were generated with Amplify Studio.           *
 * Please refrain from making any modifications to this file.              *
 * Any changes to this file will be overwritten when running amplify pull. *
 **************************************************************************/

import * as React from "react";
import { GridProps, SwitchFieldProps, TextFieldProps } from "@aws-amplify/ui-react";
import { Transcription } from "../models";
export declare type EscapeHatchProps = {
    [elementHierarchy: string]: Record<string, unknown>;
} | null;
export declare type VariantValues = {
    [key: string]: string;
};
export declare type Variant = {
    variantValues: VariantValues;
    overrides: EscapeHatchProps;
};
export declare type ValidationResponse = {
    hasError: boolean;
    errorMessage?: string;
};
export declare type ValidationFunction<T> = (value: T, validationResponse: ValidationResponse) => ValidationResponse | Promise<ValidationResponse>;
export declare type TranscriptionUpdateFormInputValues = {
    author?: string;
    coverage?: number;
    dateLastUpdated?: string;
    userLastUpdated?: string;
    length?: number;
    issues?: string;
    comments?: string;
    tags?: string;
    source?: string;
    index?: string;
    title?: string;
    type?: string;
    isPrivate?: boolean;
    isPublished?: boolean;
    disableAnalyzer?: boolean;
    editors?: string[];
    viewers?: string[];
    editorGroups?: string[];
    viewerGroups?: string[];
};
export declare type TranscriptionUpdateFormValidationValues = {
    author?: ValidationFunction<string>;
    coverage?: ValidationFunction<number>;
    dateLastUpdated?: ValidationFunction<string>;
    userLastUpdated?: ValidationFunction<string>;
    length?: ValidationFunction<number>;
    issues?: ValidationFunction<string>;
    comments?: ValidationFunction<string>;
    tags?: ValidationFunction<string>;
    source?: ValidationFunction<string>;
    index?: ValidationFunction<string>;
    title?: ValidationFunction<string>;
    type?: ValidationFunction<string>;
    isPrivate?: ValidationFunction<boolean>;
    isPublished?: ValidationFunction<boolean>;
    disableAnalyzer?: ValidationFunction<boolean>;
    editors?: ValidationFunction<string>;
    viewers?: ValidationFunction<string>;
    editorGroups?: ValidationFunction<string>;
    viewerGroups?: ValidationFunction<string>;
};
export declare type PrimitiveOverrideProps<T> = Partial<T> & React.DOMAttributes<HTMLDivElement>;
export declare type TranscriptionUpdateFormOverridesProps = {
    TranscriptionUpdateFormGrid?: PrimitiveOverrideProps<GridProps>;
    author?: PrimitiveOverrideProps<TextFieldProps>;
    coverage?: PrimitiveOverrideProps<TextFieldProps>;
    dateLastUpdated?: PrimitiveOverrideProps<TextFieldProps>;
    userLastUpdated?: PrimitiveOverrideProps<TextFieldProps>;
    length?: PrimitiveOverrideProps<TextFieldProps>;
    issues?: PrimitiveOverrideProps<TextFieldProps>;
    comments?: PrimitiveOverrideProps<TextFieldProps>;
    tags?: PrimitiveOverrideProps<TextFieldProps>;
    source?: PrimitiveOverrideProps<TextFieldProps>;
    index?: PrimitiveOverrideProps<TextFieldProps>;
    title?: PrimitiveOverrideProps<TextFieldProps>;
    type?: PrimitiveOverrideProps<TextFieldProps>;
    isPrivate?: PrimitiveOverrideProps<SwitchFieldProps>;
    isPublished?: PrimitiveOverrideProps<SwitchFieldProps>;
    disableAnalyzer?: PrimitiveOverrideProps<SwitchFieldProps>;
    editors?: PrimitiveOverrideProps<TextFieldProps>;
    viewers?: PrimitiveOverrideProps<TextFieldProps>;
    editorGroups?: PrimitiveOverrideProps<TextFieldProps>;
    viewerGroups?: PrimitiveOverrideProps<TextFieldProps>;
} & EscapeHatchProps;
export declare type TranscriptionUpdateFormProps = React.PropsWithChildren<{
    overrides?: TranscriptionUpdateFormOverridesProps | undefined | null;
} & {
    id?: string;
    transcription?: Transcription;
    onSubmit?: (fields: TranscriptionUpdateFormInputValues) => TranscriptionUpdateFormInputValues;
    onSuccess?: (fields: TranscriptionUpdateFormInputValues) => void;
    onError?: (fields: TranscriptionUpdateFormInputValues, errorMessage: string) => void;
    onChange?: (fields: TranscriptionUpdateFormInputValues) => TranscriptionUpdateFormInputValues;
    onValidate?: TranscriptionUpdateFormValidationValues;
} & React.CSSProperties>;
export default function TranscriptionUpdateForm(props: TranscriptionUpdateFormProps): React.ReactElement;
