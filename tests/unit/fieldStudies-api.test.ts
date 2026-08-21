const mockApiRequest = jest.fn();

jest.mock("@/api/apiRequest", () => ({
  apiRequest: (...args: any[]) => mockApiRequest(...args)
}));

const {
  addFieldStudyCollaborator,
  createFieldObservation,
  createFieldStudy,
  getPublicFieldStudy,
  listFieldStudies,
  listPublicFieldObservations,
  removeFieldStudyCollaborator
} = require("@/api/fieldStudies");

describe("Field Studies API", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("normalizes the authenticated study list", async () => {
    mockApiRequest.mockResolvedValueOnce({
      studies: [
        {
          _id: "study-1",
          title: "Roadside survey",
          slug: "roadside-survey",
          visibility: "private",
          accessRole: "owner"
        }
      ]
    });

    await expect(listFieldStudies()).resolves.toEqual([
      expect.objectContaining({ id: "study-1", _id: "study-1" })
    ]);
    expect(mockApiRequest).toHaveBeenCalledWith("/api/personal/field-studies");
  });

  it("creates private-by-choice studies through the personal route", async () => {
    mockApiRequest.mockResolvedValueOnce({
      study: {
        _id: "study-2",
        title: "Wetland survey",
        slug: "wetland-survey",
        visibility: "private",
        accessRole: "owner"
      }
    });

    await createFieldStudy({
      title: "Wetland survey",
      visibility: "private",
      defaultLocationPrivacy: "private"
    });

    expect(mockApiRequest).toHaveBeenCalledWith("/api/personal/field-studies", {
      method: "POST",
      body: expect.objectContaining({
        title: "Wetland survey",
        visibility: "private",
        defaultLocationPrivacy: "private"
      })
    });
  });

  it("passes an explicit collaborator role and evidence-aware observation", async () => {
    mockApiRequest.mockResolvedValueOnce({
      study: { _id: "study-1", collaborators: [] }
    });
    await addFieldStudyCollaborator("study-1", "botanist@example.com", "verifier");
    expect(mockApiRequest).toHaveBeenNthCalledWith(
      1,
      "/api/personal/field-studies/study-1/collaborators",
      {
        method: "POST",
        body: { email: "botanist@example.com", role: "verifier" }
      }
    );

    mockApiRequest.mockResolvedValueOnce({
      study: { _id: "study-1", collaborators: [] }
    });
    await removeFieldStudyCollaborator("study-1", "member-1");
    expect(mockApiRequest).toHaveBeenNthCalledWith(
      2,
      "/api/personal/field-studies/study-1/collaborators/member-1",
      { method: "DELETE" }
    );

    mockApiRequest.mockResolvedValueOnce({
      observation: { _id: "observation-1" },
      locationNotice: ""
    });
    await createFieldObservation("study-1", {
      identity: {
        commonName: "Rose",
        confidence: "low",
        verificationStatus: "ai_candidate",
        missingEvidence: ["open flower"]
      },
      evidenceAssets: [{ assetId: "photo-1", url: "https://example.com/rose.jpg" }],
      location: {
        latitude: 39.3,
        longitude: -76.7,
        privacy: "public_approximate"
      },
      publication: { status: "published", sensitiveSpecies: false }
    });

    expect(mockApiRequest).toHaveBeenNthCalledWith(
      3,
      "/api/personal/field-studies/study-1/observations",
      {
        method: "POST",
        body: expect.objectContaining({
          identity: expect.objectContaining({
            verificationStatus: "ai_candidate",
            missingEvidence: ["open flower"]
          }),
          location: expect.objectContaining({ privacy: "public_approximate" }),
          publication: expect.objectContaining({ status: "published" })
        })
      }
    );
  });

  it("loads the signed-out public map without requesting auth", async () => {
    mockApiRequest.mockResolvedValueOnce({
      observations: [
        {
          id: "observation-1",
          title: "Public rose",
          notes: "Contributor-approved public trail description."
        }
      ]
    });

    const rows = await listPublicFieldObservations({
      q: " rose ",
      bbox: [-80, 37, -74, 41],
      verificationStatus: "user_confirmed",
      invasiveStatus: "suspected",
      limit: 250
    });
    expect(rows).toEqual([
      expect.objectContaining({
        id: "observation-1",
        _id: "observation-1",
        publication: {
          publicNotes: "Contributor-approved public trail description."
        }
      })
    ]);
    expect(rows[0]).not.toHaveProperty("notes");
    expect(mockApiRequest).toHaveBeenCalledWith("/api/personal/field-studies/public", {
      auth: true,
      params: {
        q: "rose",
        bbox: "-80,37,-74,41",
        verificationStatus: "user_confirmed",
        invasiveStatus: "suspected",
        limit: 250
      }
    });
  });

  it("loads public study detail from the deployed Field Studies route family", async () => {
    mockApiRequest.mockResolvedValueOnce({
      study: { id: "study-1", slug: "roadside-survey" },
      observations: [
        {
          id: "observation-1",
          title: "Public rose",
          notes: "Sanitized public description."
        }
      ]
    });

    await expect(getPublicFieldStudy("roadside-survey")).resolves.toEqual({
      study: expect.objectContaining({ id: "study-1", _id: "study-1" }),
      observations: [
        expect.objectContaining({
          id: "observation-1",
          _id: "observation-1",
          publication: { publicNotes: "Sanitized public description." }
        })
      ]
    });
    expect(mockApiRequest).toHaveBeenCalledWith(
      "/api/personal/field-studies/public/studies/roadside-survey",
      { auth: true }
    );
  });
});
