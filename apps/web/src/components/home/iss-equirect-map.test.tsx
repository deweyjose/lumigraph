import type React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { IssEquirectMap, projectToEarthImage } from "./iss-equirect-map";

vi.mock("next/image", () => ({
  default: function MockNextImage(
    props: React.ImgHTMLAttributes<HTMLImageElement> & {
      fill?: boolean;
      priority?: boolean;
    }
  ) {
    const { alt, src, fill, priority, ...rest } = props;
    void fill;
    void priority;
    return <img alt={alt} src={typeof src === "string" ? src : ""} {...rest} />;
  },
}));

describe("projectToEarthImage", () => {
  it("maps the equator and prime meridian near the center of the world bounds", () => {
    const point = projectToEarthImage(0, 0);
    expect(point.x).toBeCloseTo(779, 0);
    expect(point.y).toBeCloseTo(483, 0);
  });

  it("keeps extreme coordinates inside the visible earth artwork bounds", () => {
    const leftTop = projectToEarthImage(-180, 90);
    const rightBottom = projectToEarthImage(180, -90);

    expect(leftTop.x).toBeCloseTo(66, 0);
    expect(leftTop.y).toBeCloseTo(170, 0);
    expect(rightBottom.x).toBeCloseTo(1492, 0);
    expect(rightBottom.y).toBeCloseTo(796, 0);
  });
});

describe("IssEquirectMap", () => {
  it("renders the public earth image and accessibility label", () => {
    const markup = renderToStaticMarkup(
      <IssEquirectMap
        lat={42.55}
        lon={-72.98}
        history={[
          { lat: 41.9, lon: -73.4 },
          { lat: 42.2, lon: -73.1 },
          { lat: 42.55, lon: -72.98 },
        ]}
      />
    );

    expect(markup).toContain("/images/earth.png");
    expect(markup).toContain(
      "ISS position approximately 42.55 degrees latitude, -72.98 degrees longitude on the Earth map"
    );
    expect(markup).toContain(
      "Earth map image with the International Space Station marked over its current ground track."
    );
  });
});
