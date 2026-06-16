import {
  ExpectedError,
  ExpectedErrorMessage,
  ExpectedErrorTitle,
} from "./expected-error";

export function ExpectedErrorBlock({
  title,
  message,
}: {
  title: string;
  message: string;
}) {
  return (
    <ExpectedError>
      <ExpectedErrorTitle>{title}</ExpectedErrorTitle>
      <ExpectedErrorMessage>{message}</ExpectedErrorMessage>
    </ExpectedError>
  );
}
