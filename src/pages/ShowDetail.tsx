import { useParams } from "react-router-dom";

const ShowDetail = () => {
  const { id } = useParams<{ id: string }>();

  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl font-bold">Show Details</h1>
      <p className="text-sm text-muted-foreground">Show ID: {id}</p>
    </div>
  );
};

export default ShowDetail;
