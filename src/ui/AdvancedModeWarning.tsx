type Props = {
  advancedMode: boolean;
};

export default function AdvancedModeWarning({ advancedMode }: Props) {
  if (!advancedMode) return null;

  return (
    <div className="warning">
      <strong>⚠️ Advanced Editing Mode</strong>
      Editing raw HTML/CSS may affect how the visual editor represents this content. Unsupported changes may not appear
      visually.
    </div>
  );
}
