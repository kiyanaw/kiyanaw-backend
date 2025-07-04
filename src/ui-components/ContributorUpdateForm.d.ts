/***************************************************************************
 * The contents of this file were generated with Amplify Studio.           *
 * Please refrain from making any modifications to this file.              *
 * Any changes to this file will be overwritten when running amplify pull. *
 **************************************************************************/

import * as React from "react";
import { GridProps, TextFieldProps } from "@aws-amplify/ui-react";
import { Contributor } from "../models";
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
export declare type ContributorUpdateFormInputValues = {
    email?: string;
    username?: string;
};
export declare type ContributorUpdateFormValidationValues = {
    email?: ValidationFunction<string>;
    username?: ValidationFunction<string>;
};
export declare type PrimitiveOverrideProps<T> = Partial<T> & React.DOMAttributes<HTMLDivElement>;
export declare type ContributorUpdateFormOverridesProps = {
    ContributorUpdateFormGrid?: PrimitiveOverrideProps<GridProps>;
    email?: PrimitiveOverrideProps<TextFieldProps>;
    username?: PrimitiveOverrideProps<TextFieldProps>;
} & EscapeHatchProps;
export declare type ContributorUpdateFormProps = React.PropsWithChildren<{
    overrides?: ContributorUpdateFormOverridesProps | undefined | null;
} & {
    id?: string;
    contributor?: Contributor;
    onSubmit?: (fields: ContributorUpdateFormInputValues) => ContributorUpdateFormInputValues;
    onSuccess?: (fields: ContributorUpdateFormInputValues) => void;
    onError?: (fields: ContributorUpdateFormInputValues, errorMessage: string) => void;
    onChange?: (fields: ContributorUpdateFormInputValues) => ContributorUpdateFormInputValues;
    onValidate?: ContributorUpdateFormValidationValues;
} & React.CSSProperties>;
export default function ContributorUpdateForm(props: ContributorUpdateFormProps): React.ReactElement;
