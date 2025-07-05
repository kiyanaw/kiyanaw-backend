/***************************************************************************
 * The contents of this file were generated with Amplify Studio.           *
 * Please refrain from making any modifications to this file.              *
 * Any changes to this file will be overwritten when running amplify pull. *
 **************************************************************************/

/* eslint-disable */
import * as React from "react";
import {
  Badge,
  Button,
  Divider,
  Flex,
  Grid,
  Icon,
  ScrollView,
  SwitchField,
  Text,
  TextField,
  useTheme,
} from "@aws-amplify/ui-react";
import { Transcription } from "../models";
import { fetchByPath, getOverrideProps, validateField } from "./utils";
import { DataStore } from "aws-amplify/datastore";
function ArrayField({
  items = [],
  onChange,
  label,
  inputFieldRef,
  children,
  hasError,
  setFieldValue,
  currentFieldValue,
  defaultFieldValue,
  lengthLimit,
  getBadgeText,
  runValidationTasks,
  errorMessage,
}) {
  const labelElement = <Text>{label}</Text>;
  const {
    tokens: {
      components: {
        fieldmessages: { error: errorStyles },
      },
    },
  } = useTheme();
  const [selectedBadgeIndex, setSelectedBadgeIndex] = React.useState();
  const [isEditing, setIsEditing] = React.useState();
  React.useEffect(() => {
    if (isEditing) {
      inputFieldRef?.current?.focus();
    }
  }, [isEditing]);
  const removeItem = async (removeIndex) => {
    const newItems = items.filter((value, index) => index !== removeIndex);
    await onChange(newItems);
    setSelectedBadgeIndex(undefined);
  };
  const addItem = async () => {
    const { hasError } = runValidationTasks();
    if (
      currentFieldValue !== undefined &&
      currentFieldValue !== null &&
      currentFieldValue !== "" &&
      !hasError
    ) {
      const newItems = [...items];
      if (selectedBadgeIndex !== undefined) {
        newItems[selectedBadgeIndex] = currentFieldValue;
        setSelectedBadgeIndex(undefined);
      } else {
        newItems.push(currentFieldValue);
      }
      await onChange(newItems);
      setIsEditing(false);
    }
  };
  const arraySection = (
    <React.Fragment>
      {!!items?.length && (
        <ScrollView height="inherit" width="inherit" maxHeight={"7rem"}>
          {items.map((value, index) => {
            return (
              <Badge
                key={index}
                style={{
                  cursor: "pointer",
                  alignItems: "center",
                  marginRight: 3,
                  marginTop: 3,
                  backgroundColor:
                    index === selectedBadgeIndex ? "#B8CEF9" : "",
                }}
                onClick={() => {
                  setSelectedBadgeIndex(index);
                  setFieldValue(items[index]);
                  setIsEditing(true);
                }}
              >
                {getBadgeText ? getBadgeText(value) : value.toString()}
                <Icon
                  style={{
                    cursor: "pointer",
                    paddingLeft: 3,
                    width: 20,
                    height: 20,
                  }}
                  viewBox={{ width: 20, height: 20 }}
                  paths={[
                    {
                      d: "M10 10l5.09-5.09L10 10l5.09 5.09L10 10zm0 0L4.91 4.91 10 10l-5.09 5.09L10 10z",
                      stroke: "black",
                    },
                  ]}
                  ariaLabel="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    removeItem(index);
                  }}
                />
              </Badge>
            );
          })}
        </ScrollView>
      )}
      <Divider orientation="horizontal" marginTop={5} />
    </React.Fragment>
  );
  if (lengthLimit !== undefined && items.length >= lengthLimit && !isEditing) {
    return (
      <React.Fragment>
        {labelElement}
        {arraySection}
      </React.Fragment>
    );
  }
  return (
    <React.Fragment>
      {labelElement}
      {isEditing && children}
      {!isEditing ? (
        <>
          <Button
            onClick={() => {
              setIsEditing(true);
            }}
          >
            Add item
          </Button>
          {errorMessage && hasError && (
            <Text color={errorStyles.color} fontSize={errorStyles.fontSize}>
              {errorMessage}
            </Text>
          )}
        </>
      ) : (
        <Flex justifyContent="flex-end">
          {(currentFieldValue || isEditing) && (
            <Button
              children="Cancel"
              type="button"
              size="small"
              onClick={() => {
                setFieldValue(defaultFieldValue);
                setIsEditing(false);
                setSelectedBadgeIndex(undefined);
              }}
            ></Button>
          )}
          <Button size="small" variation="link" onClick={addItem}>
            {selectedBadgeIndex !== undefined ? "Save" : "Add"}
          </Button>
        </Flex>
      )}
      {arraySection}
    </React.Fragment>
  );
}
export default function TranscriptionUpdateForm(props) {
  const {
    id: idProp,
    transcription: transcriptionModelProp,
    onSuccess,
    onError,
    onSubmit,
    onValidate,
    onChange,
    overrides,
    ...rest
  } = props;
  const initialValues = {
    author: "",
    coverage: "",
    dateLastUpdated: "",
    userLastUpdated: "",
    length: "",
    issues: "",
    comments: "",
    tags: "",
    source: "",
    index: "",
    title: "",
    type: "",
    isPrivate: false,
    isPublished: false,
    disableAnalyzer: false,
    editors: [],
    viewers: [],
    editorGroups: [],
    viewerGroups: [],
  };
  const [author, setAuthor] = React.useState(initialValues.author);
  const [coverage, setCoverage] = React.useState(initialValues.coverage);
  const [dateLastUpdated, setDateLastUpdated] = React.useState(
    initialValues.dateLastUpdated
  );
  const [userLastUpdated, setUserLastUpdated] = React.useState(
    initialValues.userLastUpdated
  );
  const [length, setLength] = React.useState(initialValues.length);
  const [issues, setIssues] = React.useState(initialValues.issues);
  const [comments, setComments] = React.useState(initialValues.comments);
  const [tags, setTags] = React.useState(initialValues.tags);
  const [source, setSource] = React.useState(initialValues.source);
  const [index, setIndex] = React.useState(initialValues.index);
  const [title, setTitle] = React.useState(initialValues.title);
  const [type, setType] = React.useState(initialValues.type);
  const [isPrivate, setIsPrivate] = React.useState(initialValues.isPrivate);
  const [isPublished, setIsPublished] = React.useState(
    initialValues.isPublished
  );
  const [disableAnalyzer, setDisableAnalyzer] = React.useState(
    initialValues.disableAnalyzer
  );
  const [editors, setEditors] = React.useState(initialValues.editors);
  const [viewers, setViewers] = React.useState(initialValues.viewers);
  const [editorGroups, setEditorGroups] = React.useState(
    initialValues.editorGroups
  );
  const [viewerGroups, setViewerGroups] = React.useState(
    initialValues.viewerGroups
  );
  const [errors, setErrors] = React.useState({});
  const resetStateValues = () => {
    const cleanValues = transcriptionRecord
      ? { ...initialValues, ...transcriptionRecord }
      : initialValues;
    setAuthor(cleanValues.author);
    setCoverage(cleanValues.coverage);
    setDateLastUpdated(cleanValues.dateLastUpdated);
    setUserLastUpdated(cleanValues.userLastUpdated);
    setLength(cleanValues.length);
    setIssues(cleanValues.issues);
    setComments(cleanValues.comments);
    setTags(cleanValues.tags);
    setSource(cleanValues.source);
    setIndex(cleanValues.index);
    setTitle(cleanValues.title);
    setType(cleanValues.type);
    setIsPrivate(cleanValues.isPrivate);
    setIsPublished(cleanValues.isPublished);
    setDisableAnalyzer(cleanValues.disableAnalyzer);
    setEditors(cleanValues.editors ?? []);
    setCurrentEditorsValue("");
    setViewers(cleanValues.viewers ?? []);
    setCurrentViewersValue("");
    setEditorGroups(cleanValues.editorGroups ?? []);
    setCurrentEditorGroupsValue("");
    setViewerGroups(cleanValues.viewerGroups ?? []);
    setCurrentViewerGroupsValue("");
    setErrors({});
  };
  const [transcriptionRecord, setTranscriptionRecord] = React.useState(
    transcriptionModelProp
  );
  React.useEffect(() => {
    const queryData = async () => {
      const record = idProp
        ? await DataStore.query(Transcription, idProp)
        : transcriptionModelProp;
      setTranscriptionRecord(record);
    };
    queryData();
  }, [idProp, transcriptionModelProp]);
  React.useEffect(resetStateValues, [transcriptionRecord]);
  const [currentEditorsValue, setCurrentEditorsValue] = React.useState("");
  const editorsRef = React.createRef();
  const [currentViewersValue, setCurrentViewersValue] = React.useState("");
  const viewersRef = React.createRef();
  const [currentEditorGroupsValue, setCurrentEditorGroupsValue] =
    React.useState("");
  const editorGroupsRef = React.createRef();
  const [currentViewerGroupsValue, setCurrentViewerGroupsValue] =
    React.useState("");
  const viewerGroupsRef = React.createRef();
  const validations = {
    author: [{ type: "Required" }],
    coverage: [],
    dateLastUpdated: [{ type: "Required" }],
    userLastUpdated: [],
    length: [],
    issues: [],
    comments: [],
    tags: [],
    source: [],
    index: [],
    title: [{ type: "Required" }],
    type: [{ type: "Required" }],
    isPrivate: [],
    isPublished: [],
    disableAnalyzer: [],
    editors: [],
    viewers: [],
    editorGroups: [],
    viewerGroups: [],
  };
  const runValidationTasks = async (
    fieldName,
    currentValue,
    getDisplayValue
  ) => {
    const value =
      currentValue && getDisplayValue
        ? getDisplayValue(currentValue)
        : currentValue;
    let validationResponse = validateField(value, validations[fieldName]);
    const customValidator = fetchByPath(onValidate, fieldName);
    if (customValidator) {
      validationResponse = await customValidator(value, validationResponse);
    }
    setErrors((errors) => ({ ...errors, [fieldName]: validationResponse }));
    return validationResponse;
  };
  return (
    <Grid
      as="form"
      rowGap="15px"
      columnGap="15px"
      padding="20px"
      onSubmit={async (event) => {
        event.preventDefault();
        let modelFields = {
          author,
          coverage,
          dateLastUpdated,
          userLastUpdated,
          length,
          issues,
          comments,
          tags,
          source,
          index,
          title,
          type,
          isPrivate,
          isPublished,
          disableAnalyzer,
          editors,
          viewers,
          editorGroups,
          viewerGroups,
        };
        const validationResponses = await Promise.all(
          Object.keys(validations).reduce((promises, fieldName) => {
            if (Array.isArray(modelFields[fieldName])) {
              promises.push(
                ...modelFields[fieldName].map((item) =>
                  runValidationTasks(fieldName, item)
                )
              );
              return promises;
            }
            promises.push(
              runValidationTasks(fieldName, modelFields[fieldName])
            );
            return promises;
          }, [])
        );
        if (validationResponses.some((r) => r.hasError)) {
          return;
        }
        if (onSubmit) {
          modelFields = onSubmit(modelFields);
        }
        try {
          Object.entries(modelFields).forEach(([key, value]) => {
            if (typeof value === "string" && value === "") {
              modelFields[key] = null;
            }
          });
          await DataStore.save(
            Transcription.copyOf(transcriptionRecord, (updated) => {
              Object.assign(updated, modelFields);
            })
          );
          if (onSuccess) {
            onSuccess(modelFields);
          }
        } catch (err) {
          if (onError) {
            onError(modelFields, err.message);
          }
        }
      }}
      {...getOverrideProps(overrides, "TranscriptionUpdateForm")}
      {...rest}
    >
      <TextField
        label="Author"
        isRequired={true}
        isReadOnly={false}
        value={author}
        onChange={(e) => {
          let { value } = e.target;
          if (onChange) {
            const modelFields = {
              author: value,
              coverage,
              dateLastUpdated,
              userLastUpdated,
              length,
              issues,
              comments,
              tags,
              source,
              index,
              title,
              type,
              isPrivate,
              isPublished,
              disableAnalyzer,
              editors,
              viewers,
              editorGroups,
              viewerGroups,
            };
            const result = onChange(modelFields);
            value = result?.author ?? value;
          }
          if (errors.author?.hasError) {
            runValidationTasks("author", value);
          }
          setAuthor(value);
        }}
        onBlur={() => runValidationTasks("author", author)}
        errorMessage={errors.author?.errorMessage}
        hasError={errors.author?.hasError}
        {...getOverrideProps(overrides, "author")}
      ></TextField>
      <TextField
        label="Coverage"
        isRequired={false}
        isReadOnly={false}
        type="number"
        step="any"
        value={coverage}
        onChange={(e) => {
          let value = isNaN(parseFloat(e.target.value))
            ? e.target.value
            : parseFloat(e.target.value);
          if (onChange) {
            const modelFields = {
              author,
              coverage: value,
              dateLastUpdated,
              userLastUpdated,
              length,
              issues,
              comments,
              tags,
              source,
              index,
              title,
              type,
              isPrivate,
              isPublished,
              disableAnalyzer,
              editors,
              viewers,
              editorGroups,
              viewerGroups,
            };
            const result = onChange(modelFields);
            value = result?.coverage ?? value;
          }
          if (errors.coverage?.hasError) {
            runValidationTasks("coverage", value);
          }
          setCoverage(value);
        }}
        onBlur={() => runValidationTasks("coverage", coverage)}
        errorMessage={errors.coverage?.errorMessage}
        hasError={errors.coverage?.hasError}
        {...getOverrideProps(overrides, "coverage")}
      ></TextField>
      <TextField
        label="Date last updated"
        isRequired={true}
        isReadOnly={false}
        value={dateLastUpdated}
        onChange={(e) => {
          let { value } = e.target;
          if (onChange) {
            const modelFields = {
              author,
              coverage,
              dateLastUpdated: value,
              userLastUpdated,
              length,
              issues,
              comments,
              tags,
              source,
              index,
              title,
              type,
              isPrivate,
              isPublished,
              disableAnalyzer,
              editors,
              viewers,
              editorGroups,
              viewerGroups,
            };
            const result = onChange(modelFields);
            value = result?.dateLastUpdated ?? value;
          }
          if (errors.dateLastUpdated?.hasError) {
            runValidationTasks("dateLastUpdated", value);
          }
          setDateLastUpdated(value);
        }}
        onBlur={() => runValidationTasks("dateLastUpdated", dateLastUpdated)}
        errorMessage={errors.dateLastUpdated?.errorMessage}
        hasError={errors.dateLastUpdated?.hasError}
        {...getOverrideProps(overrides, "dateLastUpdated")}
      ></TextField>
      <TextField
        label="User last updated"
        isRequired={false}
        isReadOnly={false}
        value={userLastUpdated}
        onChange={(e) => {
          let { value } = e.target;
          if (onChange) {
            const modelFields = {
              author,
              coverage,
              dateLastUpdated,
              userLastUpdated: value,
              length,
              issues,
              comments,
              tags,
              source,
              index,
              title,
              type,
              isPrivate,
              isPublished,
              disableAnalyzer,
              editors,
              viewers,
              editorGroups,
              viewerGroups,
            };
            const result = onChange(modelFields);
            value = result?.userLastUpdated ?? value;
          }
          if (errors.userLastUpdated?.hasError) {
            runValidationTasks("userLastUpdated", value);
          }
          setUserLastUpdated(value);
        }}
        onBlur={() => runValidationTasks("userLastUpdated", userLastUpdated)}
        errorMessage={errors.userLastUpdated?.errorMessage}
        hasError={errors.userLastUpdated?.hasError}
        {...getOverrideProps(overrides, "userLastUpdated")}
      ></TextField>
      <TextField
        label="Length"
        isRequired={false}
        isReadOnly={false}
        type="number"
        step="any"
        value={length}
        onChange={(e) => {
          let value = isNaN(parseFloat(e.target.value))
            ? e.target.value
            : parseFloat(e.target.value);
          if (onChange) {
            const modelFields = {
              author,
              coverage,
              dateLastUpdated,
              userLastUpdated,
              length: value,
              issues,
              comments,
              tags,
              source,
              index,
              title,
              type,
              isPrivate,
              isPublished,
              disableAnalyzer,
              editors,
              viewers,
              editorGroups,
              viewerGroups,
            };
            const result = onChange(modelFields);
            value = result?.length ?? value;
          }
          if (errors.length?.hasError) {
            runValidationTasks("length", value);
          }
          setLength(value);
        }}
        onBlur={() => runValidationTasks("length", length)}
        errorMessage={errors.length?.errorMessage}
        hasError={errors.length?.hasError}
        {...getOverrideProps(overrides, "length")}
      ></TextField>
      <TextField
        label="Issues"
        isRequired={false}
        isReadOnly={false}
        value={issues}
        onChange={(e) => {
          let { value } = e.target;
          if (onChange) {
            const modelFields = {
              author,
              coverage,
              dateLastUpdated,
              userLastUpdated,
              length,
              issues: value,
              comments,
              tags,
              source,
              index,
              title,
              type,
              isPrivate,
              isPublished,
              disableAnalyzer,
              editors,
              viewers,
              editorGroups,
              viewerGroups,
            };
            const result = onChange(modelFields);
            value = result?.issues ?? value;
          }
          if (errors.issues?.hasError) {
            runValidationTasks("issues", value);
          }
          setIssues(value);
        }}
        onBlur={() => runValidationTasks("issues", issues)}
        errorMessage={errors.issues?.errorMessage}
        hasError={errors.issues?.hasError}
        {...getOverrideProps(overrides, "issues")}
      ></TextField>
      <TextField
        label="Comments"
        isRequired={false}
        isReadOnly={false}
        value={comments}
        onChange={(e) => {
          let { value } = e.target;
          if (onChange) {
            const modelFields = {
              author,
              coverage,
              dateLastUpdated,
              userLastUpdated,
              length,
              issues,
              comments: value,
              tags,
              source,
              index,
              title,
              type,
              isPrivate,
              isPublished,
              disableAnalyzer,
              editors,
              viewers,
              editorGroups,
              viewerGroups,
            };
            const result = onChange(modelFields);
            value = result?.comments ?? value;
          }
          if (errors.comments?.hasError) {
            runValidationTasks("comments", value);
          }
          setComments(value);
        }}
        onBlur={() => runValidationTasks("comments", comments)}
        errorMessage={errors.comments?.errorMessage}
        hasError={errors.comments?.hasError}
        {...getOverrideProps(overrides, "comments")}
      ></TextField>
      <TextField
        label="Tags"
        isRequired={false}
        isReadOnly={false}
        value={tags}
        onChange={(e) => {
          let { value } = e.target;
          if (onChange) {
            const modelFields = {
              author,
              coverage,
              dateLastUpdated,
              userLastUpdated,
              length,
              issues,
              comments,
              tags: value,
              source,
              index,
              title,
              type,
              isPrivate,
              isPublished,
              disableAnalyzer,
              editors,
              viewers,
              editorGroups,
              viewerGroups,
            };
            const result = onChange(modelFields);
            value = result?.tags ?? value;
          }
          if (errors.tags?.hasError) {
            runValidationTasks("tags", value);
          }
          setTags(value);
        }}
        onBlur={() => runValidationTasks("tags", tags)}
        errorMessage={errors.tags?.errorMessage}
        hasError={errors.tags?.hasError}
        {...getOverrideProps(overrides, "tags")}
      ></TextField>
      <TextField
        label="Source"
        isRequired={false}
        isReadOnly={false}
        value={source}
        onChange={(e) => {
          let { value } = e.target;
          if (onChange) {
            const modelFields = {
              author,
              coverage,
              dateLastUpdated,
              userLastUpdated,
              length,
              issues,
              comments,
              tags,
              source: value,
              index,
              title,
              type,
              isPrivate,
              isPublished,
              disableAnalyzer,
              editors,
              viewers,
              editorGroups,
              viewerGroups,
            };
            const result = onChange(modelFields);
            value = result?.source ?? value;
          }
          if (errors.source?.hasError) {
            runValidationTasks("source", value);
          }
          setSource(value);
        }}
        onBlur={() => runValidationTasks("source", source)}
        errorMessage={errors.source?.errorMessage}
        hasError={errors.source?.hasError}
        {...getOverrideProps(overrides, "source")}
      ></TextField>
      <TextField
        label="Index"
        isRequired={false}
        isReadOnly={false}
        value={index}
        onChange={(e) => {
          let { value } = e.target;
          if (onChange) {
            const modelFields = {
              author,
              coverage,
              dateLastUpdated,
              userLastUpdated,
              length,
              issues,
              comments,
              tags,
              source,
              index: value,
              title,
              type,
              isPrivate,
              isPublished,
              disableAnalyzer,
              editors,
              viewers,
              editorGroups,
              viewerGroups,
            };
            const result = onChange(modelFields);
            value = result?.index ?? value;
          }
          if (errors.index?.hasError) {
            runValidationTasks("index", value);
          }
          setIndex(value);
        }}
        onBlur={() => runValidationTasks("index", index)}
        errorMessage={errors.index?.errorMessage}
        hasError={errors.index?.hasError}
        {...getOverrideProps(overrides, "index")}
      ></TextField>
      <TextField
        label="Title"
        isRequired={true}
        isReadOnly={false}
        value={title}
        onChange={(e) => {
          let { value } = e.target;
          if (onChange) {
            const modelFields = {
              author,
              coverage,
              dateLastUpdated,
              userLastUpdated,
              length,
              issues,
              comments,
              tags,
              source,
              index,
              title: value,
              type,
              isPrivate,
              isPublished,
              disableAnalyzer,
              editors,
              viewers,
              editorGroups,
              viewerGroups,
            };
            const result = onChange(modelFields);
            value = result?.title ?? value;
          }
          if (errors.title?.hasError) {
            runValidationTasks("title", value);
          }
          setTitle(value);
        }}
        onBlur={() => runValidationTasks("title", title)}
        errorMessage={errors.title?.errorMessage}
        hasError={errors.title?.hasError}
        {...getOverrideProps(overrides, "title")}
      ></TextField>
      <TextField
        label="Type"
        isRequired={true}
        isReadOnly={false}
        value={type}
        onChange={(e) => {
          let { value } = e.target;
          if (onChange) {
            const modelFields = {
              author,
              coverage,
              dateLastUpdated,
              userLastUpdated,
              length,
              issues,
              comments,
              tags,
              source,
              index,
              title,
              type: value,
              isPrivate,
              isPublished,
              disableAnalyzer,
              editors,
              viewers,
              editorGroups,
              viewerGroups,
            };
            const result = onChange(modelFields);
            value = result?.type ?? value;
          }
          if (errors.type?.hasError) {
            runValidationTasks("type", value);
          }
          setType(value);
        }}
        onBlur={() => runValidationTasks("type", type)}
        errorMessage={errors.type?.errorMessage}
        hasError={errors.type?.hasError}
        {...getOverrideProps(overrides, "type")}
      ></TextField>
      <SwitchField
        label="Is private"
        defaultChecked={false}
        isDisabled={false}
        isChecked={isPrivate}
        onChange={(e) => {
          let value = e.target.checked;
          if (onChange) {
            const modelFields = {
              author,
              coverage,
              dateLastUpdated,
              userLastUpdated,
              length,
              issues,
              comments,
              tags,
              source,
              index,
              title,
              type,
              isPrivate: value,
              isPublished,
              disableAnalyzer,
              editors,
              viewers,
              editorGroups,
              viewerGroups,
            };
            const result = onChange(modelFields);
            value = result?.isPrivate ?? value;
          }
          if (errors.isPrivate?.hasError) {
            runValidationTasks("isPrivate", value);
          }
          setIsPrivate(value);
        }}
        onBlur={() => runValidationTasks("isPrivate", isPrivate)}
        errorMessage={errors.isPrivate?.errorMessage}
        hasError={errors.isPrivate?.hasError}
        {...getOverrideProps(overrides, "isPrivate")}
      ></SwitchField>
      <SwitchField
        label="Is published"
        defaultChecked={false}
        isDisabled={false}
        isChecked={isPublished}
        onChange={(e) => {
          let value = e.target.checked;
          if (onChange) {
            const modelFields = {
              author,
              coverage,
              dateLastUpdated,
              userLastUpdated,
              length,
              issues,
              comments,
              tags,
              source,
              index,
              title,
              type,
              isPrivate,
              isPublished: value,
              disableAnalyzer,
              editors,
              viewers,
              editorGroups,
              viewerGroups,
            };
            const result = onChange(modelFields);
            value = result?.isPublished ?? value;
          }
          if (errors.isPublished?.hasError) {
            runValidationTasks("isPublished", value);
          }
          setIsPublished(value);
        }}
        onBlur={() => runValidationTasks("isPublished", isPublished)}
        errorMessage={errors.isPublished?.errorMessage}
        hasError={errors.isPublished?.hasError}
        {...getOverrideProps(overrides, "isPublished")}
      ></SwitchField>
      <SwitchField
        label="Disable analyzer"
        defaultChecked={false}
        isDisabled={false}
        isChecked={disableAnalyzer}
        onChange={(e) => {
          let value = e.target.checked;
          if (onChange) {
            const modelFields = {
              author,
              coverage,
              dateLastUpdated,
              userLastUpdated,
              length,
              issues,
              comments,
              tags,
              source,
              index,
              title,
              type,
              isPrivate,
              isPublished,
              disableAnalyzer: value,
              editors,
              viewers,
              editorGroups,
              viewerGroups,
            };
            const result = onChange(modelFields);
            value = result?.disableAnalyzer ?? value;
          }
          if (errors.disableAnalyzer?.hasError) {
            runValidationTasks("disableAnalyzer", value);
          }
          setDisableAnalyzer(value);
        }}
        onBlur={() => runValidationTasks("disableAnalyzer", disableAnalyzer)}
        errorMessage={errors.disableAnalyzer?.errorMessage}
        hasError={errors.disableAnalyzer?.hasError}
        {...getOverrideProps(overrides, "disableAnalyzer")}
      ></SwitchField>
      <ArrayField
        onChange={async (items) => {
          let values = items;
          if (onChange) {
            const modelFields = {
              author,
              coverage,
              dateLastUpdated,
              userLastUpdated,
              length,
              issues,
              comments,
              tags,
              source,
              index,
              title,
              type,
              isPrivate,
              isPublished,
              disableAnalyzer,
              editors: values,
              viewers,
              editorGroups,
              viewerGroups,
            };
            const result = onChange(modelFields);
            values = result?.editors ?? values;
          }
          setEditors(values);
          setCurrentEditorsValue("");
        }}
        currentFieldValue={currentEditorsValue}
        label={"Editors"}
        items={editors}
        hasError={errors?.editors?.hasError}
        runValidationTasks={async () =>
          await runValidationTasks("editors", currentEditorsValue)
        }
        errorMessage={errors?.editors?.errorMessage}
        setFieldValue={setCurrentEditorsValue}
        inputFieldRef={editorsRef}
        defaultFieldValue={""}
      >
        <TextField
          label="Editors"
          isRequired={false}
          isReadOnly={false}
          value={currentEditorsValue}
          onChange={(e) => {
            let { value } = e.target;
            if (errors.editors?.hasError) {
              runValidationTasks("editors", value);
            }
            setCurrentEditorsValue(value);
          }}
          onBlur={() => runValidationTasks("editors", currentEditorsValue)}
          errorMessage={errors.editors?.errorMessage}
          hasError={errors.editors?.hasError}
          ref={editorsRef}
          labelHidden={true}
          {...getOverrideProps(overrides, "editors")}
        ></TextField>
      </ArrayField>
      <ArrayField
        onChange={async (items) => {
          let values = items;
          if (onChange) {
            const modelFields = {
              author,
              coverage,
              dateLastUpdated,
              userLastUpdated,
              length,
              issues,
              comments,
              tags,
              source,
              index,
              title,
              type,
              isPrivate,
              isPublished,
              disableAnalyzer,
              editors,
              viewers: values,
              editorGroups,
              viewerGroups,
            };
            const result = onChange(modelFields);
            values = result?.viewers ?? values;
          }
          setViewers(values);
          setCurrentViewersValue("");
        }}
        currentFieldValue={currentViewersValue}
        label={"Viewers"}
        items={viewers}
        hasError={errors?.viewers?.hasError}
        runValidationTasks={async () =>
          await runValidationTasks("viewers", currentViewersValue)
        }
        errorMessage={errors?.viewers?.errorMessage}
        setFieldValue={setCurrentViewersValue}
        inputFieldRef={viewersRef}
        defaultFieldValue={""}
      >
        <TextField
          label="Viewers"
          isRequired={false}
          isReadOnly={false}
          value={currentViewersValue}
          onChange={(e) => {
            let { value } = e.target;
            if (errors.viewers?.hasError) {
              runValidationTasks("viewers", value);
            }
            setCurrentViewersValue(value);
          }}
          onBlur={() => runValidationTasks("viewers", currentViewersValue)}
          errorMessage={errors.viewers?.errorMessage}
          hasError={errors.viewers?.hasError}
          ref={viewersRef}
          labelHidden={true}
          {...getOverrideProps(overrides, "viewers")}
        ></TextField>
      </ArrayField>
      <ArrayField
        onChange={async (items) => {
          let values = items;
          if (onChange) {
            const modelFields = {
              author,
              coverage,
              dateLastUpdated,
              userLastUpdated,
              length,
              issues,
              comments,
              tags,
              source,
              index,
              title,
              type,
              isPrivate,
              isPublished,
              disableAnalyzer,
              editors,
              viewers,
              editorGroups: values,
              viewerGroups,
            };
            const result = onChange(modelFields);
            values = result?.editorGroups ?? values;
          }
          setEditorGroups(values);
          setCurrentEditorGroupsValue("");
        }}
        currentFieldValue={currentEditorGroupsValue}
        label={"Editor groups"}
        items={editorGroups}
        hasError={errors?.editorGroups?.hasError}
        runValidationTasks={async () =>
          await runValidationTasks("editorGroups", currentEditorGroupsValue)
        }
        errorMessage={errors?.editorGroups?.errorMessage}
        setFieldValue={setCurrentEditorGroupsValue}
        inputFieldRef={editorGroupsRef}
        defaultFieldValue={""}
      >
        <TextField
          label="Editor groups"
          isRequired={false}
          isReadOnly={false}
          value={currentEditorGroupsValue}
          onChange={(e) => {
            let { value } = e.target;
            if (errors.editorGroups?.hasError) {
              runValidationTasks("editorGroups", value);
            }
            setCurrentEditorGroupsValue(value);
          }}
          onBlur={() =>
            runValidationTasks("editorGroups", currentEditorGroupsValue)
          }
          errorMessage={errors.editorGroups?.errorMessage}
          hasError={errors.editorGroups?.hasError}
          ref={editorGroupsRef}
          labelHidden={true}
          {...getOverrideProps(overrides, "editorGroups")}
        ></TextField>
      </ArrayField>
      <ArrayField
        onChange={async (items) => {
          let values = items;
          if (onChange) {
            const modelFields = {
              author,
              coverage,
              dateLastUpdated,
              userLastUpdated,
              length,
              issues,
              comments,
              tags,
              source,
              index,
              title,
              type,
              isPrivate,
              isPublished,
              disableAnalyzer,
              editors,
              viewers,
              editorGroups,
              viewerGroups: values,
            };
            const result = onChange(modelFields);
            values = result?.viewerGroups ?? values;
          }
          setViewerGroups(values);
          setCurrentViewerGroupsValue("");
        }}
        currentFieldValue={currentViewerGroupsValue}
        label={"Viewer groups"}
        items={viewerGroups}
        hasError={errors?.viewerGroups?.hasError}
        runValidationTasks={async () =>
          await runValidationTasks("viewerGroups", currentViewerGroupsValue)
        }
        errorMessage={errors?.viewerGroups?.errorMessage}
        setFieldValue={setCurrentViewerGroupsValue}
        inputFieldRef={viewerGroupsRef}
        defaultFieldValue={""}
      >
        <TextField
          label="Viewer groups"
          isRequired={false}
          isReadOnly={false}
          value={currentViewerGroupsValue}
          onChange={(e) => {
            let { value } = e.target;
            if (errors.viewerGroups?.hasError) {
              runValidationTasks("viewerGroups", value);
            }
            setCurrentViewerGroupsValue(value);
          }}
          onBlur={() =>
            runValidationTasks("viewerGroups", currentViewerGroupsValue)
          }
          errorMessage={errors.viewerGroups?.errorMessage}
          hasError={errors.viewerGroups?.hasError}
          ref={viewerGroupsRef}
          labelHidden={true}
          {...getOverrideProps(overrides, "viewerGroups")}
        ></TextField>
      </ArrayField>
      <Flex
        justifyContent="space-between"
        {...getOverrideProps(overrides, "CTAFlex")}
      >
        <Button
          children="Reset"
          type="reset"
          onClick={(event) => {
            event.preventDefault();
            resetStateValues();
          }}
          isDisabled={!(idProp || transcriptionModelProp)}
          {...getOverrideProps(overrides, "ResetButton")}
        ></Button>
        <Flex
          gap="15px"
          {...getOverrideProps(overrides, "RightAlignCTASubFlex")}
        >
          <Button
            children="Submit"
            type="submit"
            variation="primary"
            isDisabled={
              !(idProp || transcriptionModelProp) ||
              Object.values(errors).some((e) => e?.hasError)
            }
            {...getOverrideProps(overrides, "SubmitButton")}
          ></Button>
        </Flex>
      </Flex>
    </Grid>
  );
}
